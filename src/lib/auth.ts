import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

async function loadUserContext(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: { organization: true },
        take: 1,
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user) return null;
  const membership = user.memberships[0];
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    organizationId: membership?.organizationId,
    organizationName: membership?.organization.name,
    role: membership?.role,
  };
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    ...(googleClientId && googleClientSecret
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          }),
        ]
      : []),
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
        });
        if (!user?.passwordHash) return null;
        const valid = await bcrypt.compare(
          credentials.password,
          user.passwordHash,
        );
        if (!valid) return null;
        return loadUserContext(user.id);
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;

      const email = user.email?.toLowerCase().trim();
      if (!email || !account.providerAccountId) return false;

      let dbUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { googleId: account.providerAccountId }],
        },
      });

      if (dbUser) {
        if (!dbUser.googleId) {
          dbUser = await prisma.user.update({
            where: { id: dbUser.id },
            data: { googleId: account.providerAccountId },
          });
        }
        if (user.name && user.name !== dbUser.name) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { name: user.name },
          });
        }
      } else {
        dbUser = await prisma.user.create({
          data: {
            email,
            name: user.name || email.split("@")[0],
            googleId: account.providerAccountId,
          },
        });
      }

      user.id = dbUser.id;
      return true;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }

      if (token.id) {
        const ctx = await loadUserContext(token.id as string);
        if (ctx) {
          token.id = ctx.id;
          token.organizationId = ctx.organizationId;
          token.organizationName = ctx.organizationName;
          token.role = ctx.role;
        }
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

export function googleLoginEnabled() {
  return Boolean(googleClientId && googleClientSecret);
}
