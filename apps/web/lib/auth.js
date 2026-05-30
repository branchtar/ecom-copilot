import CognitoProvider from "next-auth/providers/cognito";

export const authOptions = {
  providers: [
    CognitoProvider({
      clientId: process.env.COGNITO_CLIENT_ID,
      clientSecret: process.env.COGNITO_CLIENT_SECRET,
      issuer: process.env.COGNITO_ISSUER
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account, user, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.idToken = account.id_token;
      }
      // Capture sub and email on first sign-in.
      // token.sub is set automatically by NextAuth from the OIDC sub claim.
      // Preserve email from the user or OIDC profile if not already on the token.
      if (user?.email && !token.email) {
        token.email = user.email;
      }
      if (profile?.email && !token.email) {
        token.email = profile.email;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.idToken = token.idToken;
      // Surface sub and email on session.user for all dashboard components.
      // Never expose accessToken/idToken values in the visible UI.
      session.user = {
        ...(session.user ?? {}),
        sub:   token.sub   ?? null,
        email: token.email ?? session.user?.email ?? null,
      };
      return session;
    }
  }
};