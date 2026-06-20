import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "站点维护中 - 题库系统",
  description: "题库系统当前正在维护中，请稍后再试。",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-10 text-center shadow-2xl shadow-black/30 backdrop-blur">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-3xl">
          !
        </div>
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.3em] text-amber-300">
          Maintenance Mode
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
          题库系统暂时关闭中
        </h1>
        <p className="mt-6 text-base leading-8 text-slate-300 md:text-lg">
          当前站点正在维护和整理数据，暂时不对外提供访问。
          <br />
          请稍后再试，或联系站点维护者获取最新状态。
        </p>
        <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 px-5 py-4 text-left text-sm leading-7 text-slate-300">
          <p>恢复方式：</p>
          <p>1. 打开仓库中的 <code>src/middleware.ts</code></p>
          <p>2. 将 <code>MAINTENANCE_MODE</code> 改为 <code>false</code></p>
          <p>3. 重新部署站点</p>
        </div>
      </div>
    </main>
  );
}
