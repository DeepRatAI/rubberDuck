import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";

import { env } from "./env";

process.env.NEXTAUTH_URL ??= env.APP_URL;

const isLocalAppUrl =
  env.APP_URL.includes("localhost") || env.APP_URL.includes("127.0.0.1");

export const localAuthFallbackEnabled =
  process.env.NODE_ENV !== "production" ||
  (env.RUBBERDUCK_E2E_MODE === "true" && isLocalAppUrl);

export const authOptions: NextAuthOptions = {
  secret: env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    ...(env.GITHUB_ID && env.GITHUB_SECRET
      ? [
          GitHubProvider({
            clientId: env.GITHUB_ID,
            clientSecret: env.GITHUB_SECRET,
          }),
        ]
      : []),
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    ...(localAuthFallbackEnabled
      ? [
          CredentialsProvider({
            id: "dev-user",
            name: "Development user",
            credentials: {},
            async authorize() {
              return {
                id: "u_alex",
                name: "Alex Chen",
                email: "alex@example.dev",
                image:
                  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
              };
            },
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        session.user.name = session.user.name ?? token.name;
        session.user.email = session.user.email ?? token.email;
      }
      return session;
    },
  },
};
