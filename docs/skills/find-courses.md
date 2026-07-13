# find-courses Skill

> 状态：已落地（指引层）  
> 关联 Spec：[001：课程目录](../../specs/001-course-catalog.md)  
> Agent 文件：[`.cursor/skills/find-courses/SKILL.md`](../../.cursor/skills/find-courses/SKILL.md)

本 Skill 演示如何把**已经实现**的课程列表 API 交给 Agent 使用，并直接复用 Spec 003 的服务端 `keyword` 搜索。

## 为什么这样做

当前仓库已经实现 `GET /api/courses?keyword=`。因此本 Skill：

1. 在没有关键词时调用 `GET /api/courses`；
2. 有关键词时调用 `GET /api/courses?keyword=`，让服务端完成归一化、校验和匹配；
3. 只把返回结果解释给用户，不在 Agent 侧复制搜索业务规则。

这样能保持「Agent 接入层不复制后端逻辑」这一底线。

## 契约对齐

| 项            | 当前事实                                                                      |
| ------------- | ----------------------------------------------------------------------------- |
| Method / Path | `GET /api/courses`                                                            |
| 成功体        | `{ "data": Course[] }`，`Course` 含 `id`、`title`、`description`、`createdAt` |
| 空列表        | `200` + `{ "data": [] }`，不是错误                                            |
| 服务端筛选    | 支持可选 `keyword` Query；空白等同于省略，重复值或超长值返回 `400`            |

权威 Schema 见 [`contracts/openapi.yaml`](../../contracts/openapi.yaml)。

## 验收清单

- [ ] 用户说「列出课程 / 找 Web 相关课程」时，Agent 会加载本 Skill
- [ ] 实际 HTTP 仅为 `GET /api/courses`（可带用户指定的 base URL）
- [ ] 关键词只来自用户表述，不虚构筛选条件
- [ ] 空列表或过滤后为空时报告「没有匹配课程」，不报失败
- [ ] 错误信息不含堆栈、数据库路径或密钥
- [ ] 不在 Agent 侧复制后端搜索规则

## 演示步骤

1. 启动后端：`npm run dev --workspace backend`（默认 `http://localhost:7001`）
2. 在 Cursor 中提出：「帮我找和 React 相关的课程」
3. 确认 Agent 调用 `GET /api/courses?keyword=React`，并根据服务端返回结果回复
