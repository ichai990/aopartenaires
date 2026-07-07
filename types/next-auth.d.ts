import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    companyId: string | null;
    firstName: string;
    lastName: string;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      companyId: string | null;
      firstName: string;
      lastName: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    companyId: string | null;
    firstName: string;
    lastName: string;
  }
}

// next-auth v5 beta type ses callbacks avec le JWT de @auth/core.
declare module "@auth/core/jwt" {
  interface JWT {
    role: Role;
    companyId: string | null;
    firstName: string;
    lastName: string;
  }
}
