import type { NextAuthConfig } from "next-auth";

/**
 * Configuration edge-safe : importée par le middleware.
 * NE DOIT importer ni Prisma, ni bcryptjs (runtime Edge).
 * Le provider Credentials (Node) est ajouté dans auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: "/connexion",
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 12, // 12 h
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      // `user` n'est présent qu'à la connexion : on fige rôle + entreprise dans le JWT.
      if (user) {
        token.role = user.role;
        token.companyId = user.companyId;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.role = token.role;
      session.user.companyId = token.companyId;
      session.user.firstName = token.firstName;
      session.user.lastName = token.lastName;
      return session;
    },
  },
} satisfies NextAuthConfig;
