import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import connectDb from "./lib/db";
import User from "./models/user.model";
import bcrypt from "bcryptjs";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          await connectDb();
          const email = credentials.email as string;
          const password = credentials.password as string;

          const user = await User.findOne({ email });
          if (!user) throw new Error("No user found with this email");

          const isMatch = await bcrypt.compare(password, user.password ?? "");
          if (!isMatch) throw new Error("Incorrect password");

          if (user.isBlocked) throw new Error("Your account has been blocked");

          return {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            store_id: user.store_id?.toString() ?? null,
            isBlocked: user.isBlocked,
          };
        } catch (error) {
          throw error;
        }
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        await connectDb();
        let dbUser = await User.findOne({ email: user.email });
        if (!dbUser) {
          dbUser = await User.create({
            name: user.name,
            email: user.email,
            image: user.image,
          });
        }
        if (dbUser.isBlocked) return false; // block Google sign-in too

        user.id = dbUser._id.toString();
        user.role = dbUser.role;
        user.store_id = dbUser.store_id?.toString() ?? null;
        user.isBlocked = dbUser.isBlocked;
      }
      return true;
    },

    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email ?? "";
        token.role = user.role;
        token.store_id = (user as { store_id?: string | null }).store_id ?? null;
        token.isBlocked = (user as { isBlocked?: boolean }).isBlocked ?? false;
      }
      return token;
    },

    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.role = token.role as string;
        session.user.store_id = token.store_id as string | null;
        session.user.isBlocked = token.isBlocked as boolean;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  trustHost: true,

  // NextAuth v5 reads AUTH_SECRET automatically; we also pass it explicitly for safety
  secret: process.env.AUTH_SECRET ?? process.env.Auth_SECRET,
});
