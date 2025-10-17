import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const authOptions = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async session({ session, token }: any) {
      if (session?.user && token?.sub) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions as any);
export { handler as GET, handler as POST };
