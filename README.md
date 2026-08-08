# 足球赛事信息与互动预测平台

这是 Web 开发技术课程大作业项目，目标是实现一个面向足球赛事的信息服务与互动预测平台。用户可以浏览赛事、球队、赛程、积分榜和淘汰赛图，登录后进行比分预测、收藏比赛并参与评论；管理员负责维护赛事数据和录入比赛结果。

## 技术栈

- 前端：Next.js 16、React 19、TypeScript、Tailwind CSS 4
- 后端：Midway.js 4、Koa、TypeScript
- 数据库：关系型数据库，本地骨架阶段使用 SQLite 文件
- 工程化：npm workspaces、Prettier、ESLint、Playwright、GitHub Actions、Docker Compose

## 当前状态

旧模板代码已清理，仓库当前已实现一套可运行的足球赛事平台垂直切片：

- 后端提供健康检查、认证、赛事/阶段/比赛/球队浏览、预测、收藏、评论、积分榜、淘汰赛图、后台数据管理和比赛结果录入 API。
- 前端提供首页、赛事与球队浏览、比赛详情、个人预测、个人收藏、评论互动、积分榜、淘汰赛图和后台比赛管理页面。
- 本地数据默认持久化到 SQLite，测试使用内存库或临时文件，避免污染开发数据。
- `specs/` 维护功能规格与验收标准，`contracts/openapi.yaml` 作为 HTTP 边界的来源。
- 根级 `npm run check` 会覆盖格式、lint、类型、单元测试、构建和 Playwright 端到端测试。

后续功能开发应按 `specs → contracts → backend/frontend → test/check` 的顺序推进。

## 快速开始

环境要求：Node.js 24.14.1 及以上、npm 11 及以上。

```bash
npm install
cp .env.example .env
npm run dev
```

启动后访问：

- Web 页面：http://localhost:3000
- 后端健康检查：http://localhost:7001/api/health
- API 契约：`contracts/openapi.yaml`

前端通过同源 `/api/*` 路径代理后端，因此浏览器端不需要额外配置 CORS。

## 常用命令

```bash
npm run dev           # 同时启动前端与后端
npm run build         # 构建全部工作区
npm run test          # 运行全部测试
npm run test:e2e      # 启动前后端并运行 Playwright 端到端测试
npm run lint          # 运行静态检查
npm run typecheck     # 检查全部工作区的 TypeScript 类型
npm run format        # 格式化代码与文档
npm run format:check  # 检查代码与文档格式，不写入文件
npm run check         # 执行格式、lint、类型、测试和构建检查
npm run check:env     # 检查本地 Node/npm 环境
```

首次运行端到端测试前，需要安装 Chromium：

```bash
npx playwright install chromium
```

也可以只操作一个工作区：

```bash
npm run dev --workspace frontend
npm run dev --workspace backend
```

格式化命令统一从仓库根目录运行，不在各工作区重复定义。根级 `lint`、`typecheck`、`test` 和 `build` 会严格遍历两个工作区；任一工作区缺少对应脚本都会使命令失败。

## 目录说明

```text
.
├── frontend/          # Next.js 用户界面
├── backend/           # Midway.js API 与 SQLite 数据访问
├── specs/             # 需求与验收标准
├── contracts/         # OpenAPI 等跨端契约
├── docs/              # 架构说明
├── scripts/           # 本地开发脚本
├── infra/             # Docker 等部署配置
├── .github/           # CI 工作流
└── .cursor/           # 编辑器项目规则
```

建议先阅读 [项目总览 Spec](specs/000-product-overview.md)、[系统架构](docs/architecture.md) 和 [API 契约](contracts/openapi.yaml)。开始功能开发前先阅读 [Spec 编写规范](specs/README.md)；涉及 HTTP 时同时阅读 [Contract 编写规范](contracts/README.md)。

## 环境变量

默认值足以完成本地开发。需要覆盖时，将 `.env.example` 复制为 `.env` 并在启动命令所在的终端加载它：

```bash
set -a && source .env && set +a
npm run dev
```

不要提交 `.env`、数据库文件或密钥。

### 数据库

足球基础数据默认保存到 SQLite 文件：

- `FOOTBALL_DATABASE_PATH=./backend/data/football-platform.sqlite`

`backend/data` 已在 `.gitignore` 中忽略；本地启动后生成的 SQLite 文件不应提交。测试和 E2E 会使用内存库或临时文件，避免污染本地开发数据。

### OpenLigaDB 球队资料

球队外部资料默认调用 OpenLigaDB 官方公开接口：

- `OPENLIGADB_BASE_URL=https://api.openligadb.de`
- `OPENLIGADB_LEAGUE_SHORTCUT=bl1`
- `OPENLIGADB_LEAGUE_SEASON=2024`
- `OPENLIGADB_TIMEOUT_MS=2500`

后端使用 `GET /getavailableteams/{leagueShortcut}/{leagueSeason}` 拉取球队列表，再按本地 `openLigaDbTeamId` 查找对应球队。当前种子数据包含几个可直接演示的真实映射：

- `FC Bayern München` → `40`
- `Borussia Dortmund` → `7`
- `RB Leipzig` → `1635`
- `Eintracht Frankfurt` → `91`
- `VfB Stuttgart` → `16`

打开 `/teams/1`、`/teams/2` 或 `/teams/3` 时，如网络可访问 OpenLigaDB，页面会展示 `AVAILABLE` 的外部补充资料；网络失败或超时时，本地球队资料仍正常展示，并显示安全降级提示。

## Docker 交付

可用 Docker Compose 一条命令启动完整系统：

```bash
docker compose -f infra/compose.yaml up --build
```

启动后访问：

- Web 页面：http://localhost:3000
- 同源 API 健康检查：http://localhost:3000/api/health

Compose 会启动前端和后端容器。后端使用 SQLite 作为本地关系型数据库，并把数据库文件保存到 `football-platform-data` Docker volume：

- 容器内数据库路径：`/app/backend/data/football-platform.sqlite`
- 默认管理员账号：`admin`
- 默认管理员密码：`Admin12345`

停止服务：

```bash
docker compose -f infra/compose.yaml down
```

如需同时清除 Docker 持久化数据卷，可执行：

```bash
docker compose -f infra/compose.yaml down -v
```
