export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 sm:px-10 sm:py-16">
      <header className="grid flex-1 content-center gap-10 border-b border-slate-200 pb-12">
        <p className="font-mono text-sm font-semibold tracking-[0.18em] text-emerald-700 uppercase">
          Football match platform
        </p>
        <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
          足球赛事信息与互动预测平台
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-slate-600">
          当前已完成旧模板清理，后续将按 Spec 和 OpenAPI
          契约实现赛事浏览、比分预测、收藏、评论和管理员录入结果。
        </p>
        <a
          className="w-fit rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
          href="/api/health"
        >
          检查 API
        </a>
      </header>

      <footer className="mt-auto pt-16 text-sm text-slate-500">
        Next.js · Midway.js · TypeORM · OpenAPI
      </footer>
    </main>
  );
}
