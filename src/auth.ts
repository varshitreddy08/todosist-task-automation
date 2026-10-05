import NextAuth from 'next-auth'
import GitHub from 'next-auth/providers/github'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/db'
import { users, accounts, sessions, verificationTokens } from '@/db/schema'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const [user] = await db.select().from(users).where(eq(users.email, credentials.email as string))
        if (!user?.password) return null
        const valid = await bcrypt.compare(credentials.password as string, user.password)
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name ?? user.email?.split('@')[0] ?? 'User', image: user.image }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id
      if (user?.name) token.name = user.name
      if (user?.email) token.email = user.email
      if (user?.image) token.picture = user.image
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      if (token.name) session.user.name = token.name as string
      if (token.email) session.user.email = token.email as string
      if (token.picture) session.user.image = token.picture as string
      return session
    },
  },
})
