# Backend

Midway.js + Koa API。当前清理阶段只保留最小健康检查接口，后续会按 `contracts/openapi.yaml` 实现足球赛事平台 API。

```bash
npm run dev --workspace backend
```

默认端口为 `7001`。健康检查：

```bash
curl http://localhost:7001/api/health
```

开发新的后端行为前，先阅读对应 `specs/*.md` 和 `contracts/openapi.yaml`。涉及 HTTP 行为时先更新契约，再实现 Controller → Service → Entity/Repository 分层。

主要入口：

- `src/configuration.ts`：Midway 应用配置
- `src/controller/api.controller.ts`：HTTP API
- `src/config/config.default.ts`：运行时配置
