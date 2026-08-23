import type { AuthOptions } from 'next-auth';
import KeycloakProvider from 'next-auth/providers/keycloak';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    idToken?: string;
    email?: string;
    name?: string;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      issuer: process.env.KEYCLOAK_ISSUER!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
      }
      if (profile) {
        const p = profile as { email?: string; name?: string; preferred_username?: string };
        token.email = p.email || p.preferred_username || token.email;
        token.name = p.name || p.preferred_username || token.name;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user = {
        ...session.user,
        email: (token.email as string | undefined) || session.user?.email || null,
        name: (token.name as string | undefined) || session.user?.name || null,
      };
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
};
