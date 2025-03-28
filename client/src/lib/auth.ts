import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { NextAuthOptions } from "next-auth";
import { db } from "../../../server/db";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { z } from "zod";
import { users } from "../../../shared/schema";
import { eq } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (!parsedCredentials.success) return null;

        // In a real application, you'd hash passwords
        const { email, password } = parsedCredentials.data;
        
        // Find user by email
        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        // In a real app, check password via bcrypt compare
        if (!user) return null;
        
        // Temporary placeholder for development - in real app use proper password verification
        // This is just for demo purposes
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture;
        session.user.subscriptionStatus = token.subscriptionStatus;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (!token.email) return token;

      // If user just signed in, the user object is available
      if (user) {
        token.id = user.id;
        token.subscriptionStatus = user.subscriptionStatus || "free";
      }
      
      // On subsequent calls, fetch the user from DB to get latest subscription status
      else {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, token.email),
        });
        
        if (dbUser) {
          token.id = dbUser.id;
          token.subscriptionStatus = dbUser.subscriptionStatus;
        }
      }
      
      return token;
    },
  },
};

declare module "next-auth" {
  interface User {
    subscriptionStatus?: string;
  }
  
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image: string;
      subscriptionStatus: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    subscriptionStatus: string;
  }
}