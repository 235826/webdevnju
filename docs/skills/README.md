# Agent Skills

本目录记录如何把已有 Midway REST 能力写成 Agent 可读的 Skill（指引层）。Skill 本身不发 HTTP；Agent 仍通过已有工具调用后端。

当前示例：

| Skill                                 | 对应 API                                | 说明                                               |
| ------------------------------------- | --------------------------------------- | -------------------------------------------------- |
| [manage-courses](./manage-courses.md) | `GET /api/courses`、`POST /api/courses` | 统一路由课程查询、搜索和创建，并隔离副作用操作约束 |

可执行副本位于 `.cursor/skills/` 和 `.github/skills/` 下，供对应 Agent 按 description 发现并加载。后续课程管理 API 应继续扩展 `manage-courses`，而不是为每个 CRUD 动作新增顶层 Skill。

## 与 MCP 的关系

- **Skill**：补充何时调用、如何组装请求、如何解释结果与失败。
- **MCP Tool**：把 REST 封装成可发现、可结构化调用的执行入口。

课程作业可二选一；本仓库先提供 Skill。业务规则、鉴权与契约仍以 Midway + OpenAPI 为准，Agent 不是超级用户。
