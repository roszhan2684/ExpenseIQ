import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Apple from 'next-auth/providers/apple';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db';
import { User } from '@/lib/models/User';

const providers = [
  Credentials({
    name: 'credentials',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null;
      try {
        await connectDB();
        const user = await User.findOne({
          email: String(credentials.email).toLowerCase().trim(),
        });
        if (!user || !user.password) return null;
        if (!user.isVerified) return null; // block unverified accounts
        const valid = await bcrypt.compare(String(credentials.password), user.password);
        if (!valid) return null;
        // Return id directly so JWT callback doesn't need another DB call
        return {
          id: user._id.toString(),
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email,
          image: user.image ?? null,
        };
      } catch (err) {
        console.error('[auth] credentials error:', err);
        return null;
      }
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }) as never
  );
}
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }) as never
  );
}
if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
  providers.push(
    Apple({
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
    }) as never
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login', error: '/login' },
  providers,
  callbacks: {
    // Create DB user on first OAuth login
    async signIn({ user, account }) {
      if (account?.provider && account.provider !== 'credentials') {
        try {
          await connectDB();
          const existing = await User.findOne({ email: user.email });
          if (!existing) {
            const parts = (user.name ?? '').split(' ');
            await User.create({
              firstName: parts[0] ?? user.name ?? '',
              lastName: parts.slice(1).join(' ') || '.',
              email: user.email,
              image: user.image,
              provider: account.provider,
              isVerified: true, // OAuth users are pre-verified
            });
          }
        } catch (err) {
          console.error('[auth] OAuth signIn error:', err);
          return false;
        }
      }
      return true;
    },

    // Store user id in JWT — use what authorize() already returned, no extra DB call
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },

    async session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      if (token.name) session.user.name = token.name as string;
      return session;
    },
  },
});
