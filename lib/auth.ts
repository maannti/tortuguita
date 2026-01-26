import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

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
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("[Auth] Authorize called with email:", credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.log("[Auth] Missing email or password");
          throw new Error("Email and password required");
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string,
          },
        });

        console.log("[Auth] User found:", !!user);

        if (!user || !user.password) {
          console.log("[Auth] User not found or no password");
          throw new Error("Invalid email or password");
        }

        const isPasswordValid = await compare(
          credentials.password as string,
          user.password,
        );

        console.log("[Auth] Password valid:", isPasswordValid);

        if (!isPasswordValid) {
          throw new Error("Invalid email or password");
        }

        console.log("[Auth] Returning user with currentOrganizationId:", user.currentOrganizationId);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          currentOrganizationId: user.currentOrganizationId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.currentOrganizationId = user.currentOrganizationId;
      }

      // Update token if session is updated
      if (trigger === "update" && session) {
        token = { ...token, ...session };
      }

      // Handle migration from old organizationId to currentOrganizationId
      // Also refresh from DB if currentOrganizationId is missing
      if (!token.currentOrganizationId && token.sub) {
        try {
          // Check if there's an old organizationId in the token
          const oldOrgId = (token as Record<string, unknown>).organizationId as string | undefined;

          if (oldOrgId) {
            token.currentOrganizationId = oldOrgId;
          } else {
            // Fetch from database
            const dbUser = await prisma.user.findUnique({
              where: { id: token.sub },
              select: { currentOrganizationId: true },
            });
            if (dbUser?.currentOrganizationId) {
              token.currentOrganizationId = dbUser.currentOrganizationId;
            }
          }
        } catch (error) {
          console.error("Error fetching user organization:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.currentOrganizationId = token.currentOrganizationId as string | null;
      }
      return session;
    },
    async signIn({ user, account }) {
      // For OAuth providers, ensure user has an organization
      if (account?.provider !== "credentials") {
        const existingUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: { userOrganizations: true },
        });

        if (existingUser && existingUser.userOrganizations.length === 0) {
          // Create personal organization for new OAuth users
          const organization = await prisma.organization.create({
            data: {
              name: `${user.name || "My"} Personal`,
              isPersonal: true,
            },
          });

          // Create membership
          await prisma.userOrganization.create({
            data: {
              userId: existingUser.id,
              organizationId: organization.id,
              role: "owner",
            },
          });

          // Set as current organization
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { currentOrganizationId: organization.id },
          });
        }
      }

      return true;
    },
  },
});
