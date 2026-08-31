import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      isPlatformAdmin?: boolean;
      organizationId?: string;
      organizationName?: string;
      role?: string;
      businessMode?: string;
      professionalId?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isPlatformAdmin?: boolean;
    organizationId?: string;
    organizationName?: string;
    role?: string;
    businessMode?: string;
    professionalId?: string | null;
  }
}

export {};
