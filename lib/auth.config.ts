import type { NextAuthConfig } from "next-auth";

// Config edge-safe (sem Prisma/bcrypt) usada pelo middleware.
export const authConfig = {
  trustHost: true, // necessário atrás do proxy do Render
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isPublic =
        pathname.startsWith("/login") || pathname.startsWith("/register");
      if (isPublic) {
        // Já autenticado a tentar ir para login/registo => manda para o dashboard.
        if (isLoggedIn) return Response.redirect(new URL("/", request.nextUrl));
        return true;
      }
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) session.user.id = token.id as string;
      return session;
    },
  },
} satisfies NextAuthConfig;
