import { prisma } from "@/lib/prisma";
import { getFallbackStore } from "@/lib/fallback-store";
import type { TeamUser } from "@/lib/types";
import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import {
  adminRoles,
  allowAdminCredentialsFallback,
  hasRole,
  isGoogleEmailApproved,
  lockoutMinutes,
  maxFailedLoginAttempts,
  shouldRequireProviderMfa,
} from "@/lib/security";

function appUrl() {
  return process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

function googleProviderConfigured() {
  return Boolean(process.env.GOOGLE_AUTH_CLIENT_ID && process.env.GOOGLE_AUTH_CLIENT_SECRET);
}

function isTrustedGoogleMfa() {
  return String(process.env.GOOGLE_AUTH_ASSUME_MFA ?? "false").toLowerCase() === "true";
}

async function writeSecurityAudit(input: {
  action: string;
  actorId?: string | null;
  email?: string | null;
  reason?: string;
  metadata?: Record<string, unknown>;
}) {
  await writeAuditLog({
    actorId: input.actorId,
    action: input.action,
    entityType: "AUTH",
    entityId: input.email ?? input.actorId ?? "auth",
    metadata: {
      ...input.metadata,
      reason: input.reason,
      email: input.email ?? undefined,
    },
  });
}

async function getUserByEmail(email: string): Promise<TeamUser | null> {
  const normalized = email.trim().toLowerCase();
  if (!process.env.DATABASE_URL) {
    return getFallbackStore().users.find((user) => user.email.toLowerCase() === normalized) ?? null;
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalized,
          mode: "insensitive",
        },
      },
    });
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      googleSub: user.googleSub,
      phone: user.phone,
      role: user.role,
      passwordHash: user.passwordHash,
      isActive: user.isActive,
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.lockedUntil?.toISOString() ?? null,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      lastLoginProvider: user.lastLoginProvider ?? null,
      requireGoogleMfa: user.requireGoogleMfa,
    };
  } catch {
    return getFallbackStore().users.find((user) => user.email.toLowerCase() === normalized) ?? null;
  }
}

async function updateUserSecurityFields(
  userId: string,
  updates: Partial<
    Pick<
      TeamUser,
      | "failedLoginAttempts"
      | "lockedUntil"
      | "lastLoginAt"
      | "lastLoginProvider"
      | "googleSub"
    >
  >,
) {
  if (!process.env.DATABASE_URL) {
    const user = getFallbackStore().users.find((item) => item.id === userId);
    if (!user) return;
    Object.assign(user, updates);
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: updates.failedLoginAttempts,
      lockedUntil:
        updates.lockedUntil === null
          ? null
          : updates.lockedUntil
            ? new Date(updates.lockedUntil)
            : undefined,
      lastLoginAt: updates.lastLoginAt ? new Date(updates.lastLoginAt) : undefined,
      lastLoginProvider: updates.lastLoginProvider,
      googleSub: updates.googleSub,
    },
  });
}

function isLocked(user: TeamUser): boolean {
  if (!user.lockedUntil) return false;
  const until = new Date(user.lockedUntil);
  if (Number.isNaN(until.getTime())) return false;
  return until > new Date();
}

async function registerFailedLogin(user: TeamUser, email: string) {
  const attempts = (user.failedLoginAttempts ?? 0) + 1;
  const threshold = maxFailedLoginAttempts();
  const shouldLock = attempts >= threshold;
  const lockedUntil = shouldLock
    ? new Date(Date.now() + lockoutMinutes() * 60_000).toISOString()
    : null;
  await updateUserSecurityFields(user.id, {
    failedLoginAttempts: attempts,
    lockedUntil,
  });
  await writeSecurityAudit({
    action: "LOGIN_FAILURE",
    actorId: user.id,
    email,
    reason: shouldLock ? "ACCOUNT_LOCKED" : "INVALID_CREDENTIALS",
    metadata: { attempts, lockoutThreshold: threshold, lockedUntil },
  });
}

async function registerSuccessfulLogin(user: TeamUser, provider: "CREDENTIALS" | "GOOGLE") {
  const now = new Date().toISOString();
  await updateUserSecurityFields(user.id, {
    failedLoginAttempts: 0,
    lockedUntil: null,
    lastLoginAt: now,
    lastLoginProvider: provider,
  });
  await writeSecurityAudit({
    action: "LOGIN_SUCCESS",
    actorId: user.id,
    email: user.email,
    metadata: { provider },
  });
}

async function linkGoogleSubIfNeeded(user: TeamUser, googleSub?: string | null) {
  if (!googleSub || user.googleSub === googleSub) return;
  await updateUserSecurityFields(user.id, { googleSub });
}

function formatAccessDeniedMessage(reason: string): string {
  const map: Record<string, string> = {
    google_not_approved:
      "Google account is not approved for Sovereign Leasing Ops. Contact a Super Admin for invite access.",
    google_mfa_required:
      "Admin and Super Admin Google sign-in requires enforced MFA. Ask your Super Admin to enforce Google MFA or enable trusted Google MFA in environment settings.",
    credentials_admin_disabled:
      "Admin and Super Admin password login is disabled. Use Google sign-in with MFA.",
  };
  return map[reason] ?? "Access denied.";
}

async function resolveGoogleUser(input: {
  email?: string | null;
  sub?: string | null;
}): Promise<{ user: TeamUser | null; reason?: string }> {
  const email = input.email?.trim().toLowerCase();
  if (!email) return { user: null, reason: "google_not_approved" };
  if (!isGoogleEmailApproved(email)) return { user: null, reason: "google_not_approved" };

  const user = await getUserByEmail(email);
  if (!user || !user.isActive) {
    return { user: null, reason: "google_not_approved" };
  }
  await linkGoogleSubIfNeeded(user, input.sub ?? null);
  return { user };
}

const providers = [
  CredentialsProvider({
    name: "Sovereign Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "").trim().toLowerCase();
      const password = String(credentials?.password ?? "");
      if (!email || !password) {
        await writeSecurityAudit({
          action: "LOGIN_FAILURE",
          email,
          reason: "MISSING_CREDENTIALS",
        });
        return null;
      }

      const user = await getUserByEmail(email);
      if (!user?.isActive) {
        await writeSecurityAudit({
          action: "LOGIN_FAILURE",
          email,
          reason: "INACTIVE_OR_UNKNOWN_USER",
        });
        return null;
      }

      if (isLocked(user)) {
        await writeSecurityAudit({
          action: "LOGIN_FAILURE",
          actorId: user.id,
          email,
          reason: "ACCOUNT_LOCKED",
          metadata: { lockedUntil: user.lockedUntil },
        });
        throw new Error("ACCOUNT_LOCKED");
      }

      const valid = await compare(password, user.passwordHash);
      if (!valid) {
        await registerFailedLogin(user, email);
        return null;
      }

      if (
        hasRole(user.role, adminRoles) &&
        !allowAdminCredentialsFallback() &&
        process.env.NODE_ENV === "production"
      ) {
        await writeSecurityAudit({
          action: "LOGIN_FAILURE",
          actorId: user.id,
          email,
          reason: "CREDENTIALS_DISABLED_FOR_ADMIN",
        });
        throw new Error("CREDENTIALS_ADMIN_DISABLED");
      }

      await registerSuccessfulLogin(user, "CREDENTIALS");
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mfaRequired: false,
        mfaSatisfied: true,
        authProvider: "CREDENTIALS",
      };
    },
  }),
];

if (googleProviderConfigured()) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_AUTH_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_AUTH_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "select_account",
        },
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 30,
  },
  useSecureCookies: process.env.NODE_ENV === "production",
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") {
        return true;
      }

      const email = user.email ?? (profile && "email" in profile ? String(profile.email ?? "") : "");
      const sub = profile && "sub" in profile ? String(profile.sub ?? "") : null;
      const resolved = await resolveGoogleUser({ email, sub });
      if (!resolved.user) {
        await writeSecurityAudit({
          action: "LOGIN_FAILURE",
          email,
          reason: resolved.reason ?? "google_not_approved",
          metadata: { provider: "GOOGLE" },
        });
        return `${appUrl()}/login?error=${encodeURIComponent(resolved.reason ?? "google_not_approved")}`;
      }

      if (shouldRequireProviderMfa(resolved.user) && !isTrustedGoogleMfa()) {
        await writeSecurityAudit({
          action: "LOGIN_FAILURE",
          actorId: resolved.user.id,
          email: resolved.user.email,
          reason: "google_mfa_required",
          metadata: { provider: "GOOGLE" },
        });
        return `${appUrl()}/login?error=google_mfa_required`;
      }

      (user as { id?: string; role?: TeamUser["role"]; authProvider?: string }).id = resolved.user.id;
      (user as { role?: TeamUser["role"] }).role = resolved.user.role;
      (user as { authProvider?: string }).authProvider = "GOOGLE";
      await registerSuccessfulLogin(resolved.user, "GOOGLE");
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        const typed = user as {
          role?: TeamUser["role"];
          mfaRequired?: boolean;
          mfaSatisfied?: boolean;
          authProvider?: string;
        };
        token.role = typed.role;
        token.mfaRequired = typed.mfaRequired ?? false;
        token.mfaSatisfied = typed.mfaSatisfied ?? true;
        token.authProvider = typed.authProvider ?? account?.provider?.toUpperCase();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as TeamUser["role"]) ?? "READ_ONLY";
        session.user.mfaRequired = Boolean(token.mfaRequired);
        session.user.mfaSatisfied = Boolean(token.mfaSatisfied);
        session.user.authProvider = (token.authProvider as string | undefined) ?? "CREDENTIALS";
      }
      return session;
    },
  },
};

export async function getAppSession() {
  return getServerSession(authOptions);
}

export async function requireAppUser() {
  const session = await getAppSession();
  if (!session?.user?.email) {
    redirect("/login");
  }
  return session.user;
}

export function getLoginErrorMessage(code?: string | null): string | null {
  if (!code) return null;
  if (code === "CredentialsSignin") {
    return "Invalid credentials or your account is not active.";
  }
  if (code === "ACCOUNT_LOCKED") {
    return "Your account is temporarily locked due to repeated failed sign-in attempts.";
  }
  return formatAccessDeniedMessage(code);
}
