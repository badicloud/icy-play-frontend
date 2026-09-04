import NextAuth from "next-auth";
import type { NextAuthConfig, NextAuthResult } from "next-auth";
import type { Provider } from "next-auth/providers";
import Facebook from "next-auth/providers/facebook";
import Google from "next-auth/providers/google";

export const providers: Provider[] = [Google, Facebook];

const config = {
  theme: { logo: "/assets/images/logo/logo.svg" },
  pages: {
    signIn: "/sign-in",
  },
  providers,
  basePath: "/auth",
  trustHost: true,
  callbacks: {
    authorized() {
      /** Checkout information to how to use middleware for authorization
       * https://next-auth.js.org/configuration/nextjs#middleware
       */
      return true;
    },
    jwt({ token, trigger, account, user }) {
      if (trigger === "update") {
        token.name = user.name;
      }

      if (account?.provider === "keycloak") {
        return { ...token, accessToken: account.access_token };
      }

      return token;
    },
    session({ session, token }) {
      if (token.accessToken && typeof token.accessToken === "string") {
        session.accessToken = token.accessToken;
      }

      return session;
    },
  },
  experimental: {
    enableWebAuthn: true,
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV !== "production",
} satisfies NextAuthConfig;

export type AuthJsProvider = {
  id: string;
  name: string;
  style?: {
    text?: string;
    bg?: string;
  };
};

export const authJsProviderMap: AuthJsProvider[] = providers
  .map((provider) => {
    const providerData = typeof provider === "function" ? provider() : provider;

    return {
      id: providerData.id,
      name: providerData.name,
      style: {
        text: (providerData as { style?: { text: string } }).style?.text,
        bg: (providerData as { style?: { bg: string } }).style?.bg,
      },
    };
  })
  .filter((provider) => provider.id !== "credentials");

const nextAuthResult: NextAuthResult = NextAuth(config);

export const handlers: NextAuthResult["handlers"] = nextAuthResult.handlers;
export const auth: NextAuthResult["auth"] = nextAuthResult.auth;
export const signIn: NextAuthResult["signIn"] = nextAuthResult.signIn;
export const signOut: NextAuthResult["signOut"] = nextAuthResult.signOut;
