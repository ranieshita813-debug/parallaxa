import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { getUserByEmail, validatePassword } from '@/lib/db/user';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await getUserByEmail(email);
        if (!user) return null;

        const valid = await validatePassword(user, password);
        if (!valid) return null;

        if (user.is_frozen) {
          throw new Error('Account is frozen. Please contact administrator.');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          is_frozen: user.is_frozen,
          emailVerified: user.email_verified,
        } as any;
      },
    }),
  ],
});