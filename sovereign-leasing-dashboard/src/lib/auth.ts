import { prisma } from "@/lib/prisma";
import { getFallbackStore } from "@/lib/fallback-store";
import type { TeamUser } from "@/lib/types";
import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

async function getUserByEmail(email: string): Promise<TeamUser | null> {
  if (!process.env.DATABASE_URL) {
    return getFallbackStore().users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      passwordHash: user.passwordHash,
      isActive: user.isActive,
    };
  } catch {
    return getFallbackStore().users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Sovereign Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;

        const user = await getUserByEmail(credentials.email);
        if (!user?.isActive) return null;

        const valid = await compare(credentials.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as TeamUser["role"]) ?? "READ_ONLY";
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
