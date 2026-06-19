import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// 使用 authConfig 创建轻量级 auth（不依赖 Prisma，可在 Edge 运行）
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|public).*)"],
};
