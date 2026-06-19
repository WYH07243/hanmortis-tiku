import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const protectedPaths = ["/dashboard", "/practice", "/import", "/wrong-questions"];
      const authPaths = ["/login", "/register"];
      const { pathname } = nextUrl;

      // 已登录用户访问登录/注册页 → 重定向到首页
      if (isLoggedIn && authPaths.some((p) => pathname.startsWith(p))) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // 未登录用户访问受保护页面 → 重定向到登录页
      if (!isLoggedIn && protectedPaths.some((p) => pathname.startsWith(p))) {
        const loginUrl = new URL("/login", nextUrl);
        loginUrl.searchParams.set("callbackUrl", pathname);
        return Response.redirect(loginUrl);
      }

      return true;
    },
  },
  session: { strategy: "jwt" },
  providers: [], // middleware 不需要 provider
} satisfies NextAuthConfig;
