import type { Role } from "@/generated/prisma/client";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      role: Role;
      objectId: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
  interface User {
    role: Role;
    objectId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    objectId: string | null;
  }
}
