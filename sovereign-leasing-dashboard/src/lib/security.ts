import type { TeamUser, UserRole } from "@/lib/types";

export const adminRoles: UserRole[] = ["SUPER_ADMIN", "ADMIN"];
export const gmailSettingsRoles: UserRole[] = ["SUPER_ADMIN", "ADMIN"];
export const gmailImportRoles: UserRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "AGENT",
  "MARKETING_ASSISTANT",
  "ASSISTANT",
];

export function hasRole(role: string | undefined, allowed: UserRole[]): boolean {
  if (!role) return false;
  return allowed.includes(role as UserRole);
}

export function debugToolsEnabled(): boolean {
  return String(process.env.ENABLE_DEBUG_TOOLS ?? "false").toLowerCase() === "true";
}

export function parseAllowedGoogleDomains(): string[] {
  const value = process.env.ALLOWED_GOOGLE_DOMAINS ?? process.env.ALLOWED_GOOGLE_DOMAIN ?? "";
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function parseApprovedGoogleUsers(): string[] {
  const value = process.env.APPROVED_GOOGLE_USERS ?? "";
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isGoogleEmailApproved(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return false;

  const approvedUsers = parseApprovedGoogleUsers();
  if (approvedUsers.includes(normalized)) return true;

  const approvedDomains = parseAllowedGoogleDomains();
  if (!approvedDomains.length) return true;
  const domain = normalized.split("@")[1] ?? "";
  return approvedDomains.includes(domain);
}

export function shouldRequireProviderMfa(user: Pick<TeamUser, "role" | "requireGoogleMfa">): boolean {
  if (!hasRole(user.role, ["SUPER_ADMIN", "ADMIN"])) return false;
  return user.requireGoogleMfa !== false;
}

export function allowAdminCredentialsFallback(): boolean {
  return String(process.env.ALLOW_ADMIN_CREDENTIALS_FALLBACK ?? "false").toLowerCase() === "true";
}

export function maxFailedLoginAttempts(): number {
  const parsed = Number(process.env.MAX_FAILED_LOGIN_ATTEMPTS ?? "5");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

export function lockoutMinutes(): number {
  const parsed = Number(process.env.LOGIN_LOCKOUT_MINUTES ?? "15");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 15;
}
