import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
        <div className="text-gray-400">加载中...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
