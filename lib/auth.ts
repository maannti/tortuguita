import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { hit, limiters, clientIdFromRequest } from "@/lib/rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
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
      async authorize(credentials, request) {
        // IP-based rate limit. NextAuth v5 hands us the underlying Request.
        if (request) {
          const limit = hit(clientIdFromRequest(request), limiters.login);
          if (!limit.ok) {
            throw new Error(
              `Too many login attempts. Try again in ${limit.retryAfterSeconds} seconds.`,
            );
          }
        }

        if (!credentials?.email || !credentials?.password) {
          // Single generic error to avoid leaking which step failed
          throw new Error("Invalid email or password");
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string,
          },
        });

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          user.password,
        );

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          currentOrganizationId: user.currentOrganizationId,
        };
      },
    }),
  ],
  events: {
    // Fires only once when a brand-new user is created via OAuth.
    // Creates a personal org so the user lands on a working dashboard.
    async createUser({ user }) {
      if (!user.id) return;
      const displayName = user.name || user.email || "Mi espacio";
      const org = await prisma.organization.create({
        data: {
          name: `${displayName} Personal`,
          isPersonal: true,
          userOrganizations: {
            create: { userId: user.id, role: "owner" },
          },
        },
      });
      await prisma.user.update({
        where: { id: user.id },
        data: {
          currentOrganizationId: org.id,
          organizationId: org.id, // keep legacy field in sync
        },
      });
    },
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // 1. Initial sign-in: copy fields from `user` returned by authorize()
      if (user) {
        token.currentOrganizationId = user.currentOrganizationId;
      }

      // 2. Manual session.update() from the client (e.g. after switching org)
      if (trigger === "update" && session) {
        token = { ...token, ...session };
      }

      // 3. Repair / migration path: only run a DB lookup when the token
      //    doesn't have currentOrganizationId yet. This covers:
      //    - Tokens issued before the multi-org migration (have `organizationId`).
      //    - Edge cases where the OAuth flow used to leave it blank.
      //    Skipping the query on every request saves a round-trip per call.
      if (token.sub && !token.currentOrganizationId) {
        // Try the legacy field first (will exist on tokens issued pre-migration).
        const legacyOrgId = (token as Record<string, unknown>).organizationId as
          | string
          | undefined;
        if (legacyOrgId) {
          token.currentOrganizationId = legacyOrgId;
        } else {
          try {
            const dbUser = await prisma.user.findUnique({
              where: { id: token.sub },
              select: {
                currentOrganizationId: true,
                userOrganizations: {
                  select: { organizationId: true },
                  take: 1,
                },
              },
            });

            if (dbUser?.currentOrganizationId) {
              token.currentOrganizationId = dbUser.currentOrganizationId;
            } else if (dbUser?.userOrganizations?.[0]?.organizationId) {
              const firstOrgId = dbUser.userOrganizations[0].organizationId;
              token.currentOrganizationId = firstOrgId;
              await prisma.user.update({
                where: { id: token.sub },
                data: { currentOrganizationId: firstOrgId },
              });
            }
          } catch (error) {
            console.error("Error fetching user organization:", error);
          }
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.currentOrganizationId = token.currentOrganizationId as
          | string
          | null;
      }
      return session;
    },
  },
});
