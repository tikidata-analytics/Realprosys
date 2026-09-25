import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import pool from "@/lib/db";
import { verifyPassword, hashPassword, createToken, generateId } from "@/lib/auth";

declare module "next-auth" {
  interface User {
    role?: string;
    tier?: string;
    username?: string;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      tier: string;
    };
  }
}

declare module "next-auth" {
  interface User {
    role?: string;
    tier?: string;
    username?: string;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
    role?: string;
    tier?: string;
    tokenVersion?: number;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = (credentials.email as string).toLowerCase().trim();
        const result = await pool.query(
          "SELECT id, email, name, username, password_hash, role, tier, token_version FROM users WHERE LOWER(email) = LOWER($1)",
          [email]
        );

        if (!result.rows.length) return null;
        const user = result.rows[0];
        const valid = await verifyPassword(credentials.password as string, user.password_hash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          role: user.role ?? "user",
          tier: user.tier ?? "free",
        } as { id: string; email: string; name: string; username?: string; role: string; tier: string };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, account }) {
      // First sign-in (Google OAuth or Credentials)
      if (user) {
        token.userId = user.id;
        token.role = (user as { role?: string }).role ?? "user";
        token.tier = (user as { tier?: string }).tier ?? "free";
        token.tokenVersion = 1;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.tier = token.tier as string;
      }
      return session;
    },
    async signIn({ user, account }) {
      // Google OAuth — upsert user in our DB
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase().trim();
        if (!email) return false;

        const existing = await pool.query(
          "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
          [email]
        );

        if (existing.rows.length > 0) {
          // Existing user — update name/image if changed
          await pool.query(
            "UPDATE users SET name = $1 WHERE LOWER(email) = LOWER($2)",
            [user.name ?? null, email]
          );
        } else {
          // New user — create account with free tier
          const id = generateId();
          await pool.query(
            `INSERT INTO users (id, email, name, username, password_hash, role, tier, token_version)
             VALUES ($1, $2, $3, $4, $5, 'user', 'free', 1)`,
            [
              id,
              email,
              user.name ?? null,
              email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_"),
              "", // no password for Google users
            ]
          );
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
});
