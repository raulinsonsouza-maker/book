import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          include: {
            memberships: {
              include: { organization: true },
              take: 1,
              orderBy: { createdAt: "asc" },
            },
          },
        });
        if (!user) return null;
        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );
        if (!valid) return null;
        const membership = user.memberships[0];
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          organizationId: membership?.organizationId,
          organizationName: membership?.organization.name,
          role: membership?.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.organizationId = (
          user as { organizationId?: string }
        ).organizationId;
        token.organizationName = (
          user as { organizationName?: string }
        ).organizationName;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.organizationId = token.organizationId as string | undefined;
        session.user.organizationName = token.organizationName as
          | string
          | undefined;
        session.user.role = token.role as string | undefined;
      }
      return session;
    },
  },
};
