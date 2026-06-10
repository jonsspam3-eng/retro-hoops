import type { UserRole } from "@/lib/types";
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: UserRole;
      mfaRequired?: boolean;
      mfaSatisfied?: boolean;
      authProvider?: string;
    };
  }

  interface User {
    role: UserRole;
    mfaRequired?: boolean;
    mfaSatisfied?: boolean;
    authProvider?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    mfaRequired?: boolean;
    mfaSatisfied?: boolean;
    authProvider?: string;
  }
}
