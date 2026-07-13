# manage-courses Skill

> 状态：已落地（指引层）  
> 关联 Spec：[001：课程目录](../../specs/001-course-catalog.md)、[003：课程关键词搜索](../../specs/003-course-keyword-search.md)、[004：课程创建 HTTP 边界](../../specs/004-course-create-http-boundary.md)  
> Agent 文件：[`.cursor/skills/manage-courses/SKILL.md`](../../.cursor/skills/manage-courses/SKILL.md)

本 Skill 是课程管理 Agent 的统一能力入口。它根据用户意图选择已经实现的查询或创建 API，并为以后增加按 ID 查询、更新和删除课程保留统一的扩展位置。

## 当前能力

| 用户意图                     | Method / Path                        | 行为边界                                     |
| ---------------------------- | ------------------------------------ | -------------------------------------------- |
| 列出课程                     | `GET /api/courses`                   | 返回全部课程；空数组不是错误                 |
| 按关键词查找课程             | `GET /api/courses?keyword={keyword}` | 由服务端完成归一化、校验和匹配               |
| 使用确认的标题和简介创建课程 | `POST /api/courses`                  | 缺少字段时补问；未经指示不自动重试副作用请求 |

尚未进入 OpenAPI 契约的更新、删除等操作不会由 Agent 模拟，也不会通过直写数据库绕过 HTTP 边界。

## 设计方式

- `SKILL.md` 只负责触发、意图路由和公共 API 边界。
- `references/list-and-search.md` 保存只读查询流程。
- `references/create.md` 保存创建流程及副作用保护。
- `.cursor/skills/` 和 `.github/skills/` 保存内容一致的可执行副本。

这种结构让 Agent 只加载当前操作需要的细节。新增课程管理能力时，应先完成 Spec 和 OpenAPI，再增加对应的一级 reference 和路由规则。

## 验收清单

- [ ] 用户说「列出课程 / 找 Web 相关课程」时，Agent 加载本 Skill 并调用 `GET /api/courses`
- [ ] 用户说「创建 / 添加 / 保存课程」时，Agent 加载本 Skill 并调用 `POST /api/courses`
- [ ] 查询关键词只来自用户表述，空结果不被报告为失败
- [ ] 创建缺少标题或简介时只补问缺失字段
- [ ] 创建请求只包含用户确认的 `title` 和 `description`，且未经指示不自动重试
- [ ] Agent 不模拟当前契约未支持的更新或删除操作
- [ ] 失败信息不泄露堆栈、SQL、数据库路径、密钥或其他内部诊断

## 演示步骤

1. 启动后端：`npm run dev --workspace backend`（默认 `http://localhost:7001`）。
2. 提出：「帮我找和 React 相关的课程」，确认 Agent 调用带 `keyword` 的 `GET /api/courses`。
3. 提出：「创建课程《TypeScript 入门》，简介是‘从类型基础到工程实践’」，确认 Agent 只发送一次 `POST /api/courses`。
