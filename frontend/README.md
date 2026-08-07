# Frontend

Next.js App Router 前端。它通过 `next.config.ts` 把 `/api/*` 请求转发到 Midway 后端。

```bash
npm run dev --workspace frontend
```

当前清理阶段只保留足球赛事平台首页骨架。后续页面应围绕赛事浏览、比赛详情、球队资料、预测、收藏、评论和管理端逐步实现。

主要入口：

- `src/app/page.tsx`：首页服务端组件
- `src/app/globals.css`：Tailwind CSS 入口和全局主题
