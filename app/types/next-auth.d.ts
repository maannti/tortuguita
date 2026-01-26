
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      currentOrganizationId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    currentOrganizationId?: string | null;
  }

  interface JWT {
    currentOrganizationId?: string | null;
  }
}
