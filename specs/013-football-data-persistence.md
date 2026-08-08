# 013：足球基础数据持久化

> 状态：已验收
>
> 关联事项：Web 开发技术课程大作业

## 目标

赛事、阶段、球队、比赛和比赛结果在服务重启后仍然存在，管理员通过后台维护的数据不会因为进程退出而丢失。

## 用户故事

作为管理员，我希望维护的足球基础数据被持久保存，以便重启服务后用户仍能浏览和互动同一批赛事数据。

## 范围

- 持久化 Competition、Stage、Team、Match。
- 持久化 Match result。
- 首次启动时初始化真实赛事和球队种子数据。
- 数据库文件路径可通过环境变量配置。
- 保持现有 HTTP 请求、响应和权限语义不变。
- 保持 010 的基础数据删除和关联清理语义。

## 非目标

- 迁移用户账号存储。
- 持久化 Prediction、Favorite、Comment。
- 多实例部署和分布式锁。
- 复杂数据库迁移框架。
- Docker 交付。

## 业务规则

- **BR-01**：服务首次启动且数据库为空时，必须写入当前真实赛事、阶段、球队和比赛种子数据。
- **BR-02**：管理员创建或编辑 Competition、Stage、Team、Match 后，重建 Repository 或重启服务仍能读取该数据。
- **BR-03**：管理员录入比赛结果后，重建 Repository 或重启服务仍能读取该结果。
- **BR-04**：删除 Competition、Stage、Team、Match 后，重建 Repository 或重启服务仍不应读回被删除对象。
- **BR-05**：生成数据库文件不得进入版本控制。
- **BR-06**：数据库文件不可用或 schema 初始化失败时，API 必须返回安全错误，不暴露文件路径、SQL 或堆栈。

## Contract 影响

- 结论：无。
- 理由或影响摘要：本次只改变服务端存储方式，不改变 HTTP 路径、参数、请求体、响应体、状态码或权限语义。
- OpenAPI operation：无。
- 迁移 / 废弃安排：不适用。

## 验收标准

- **AC-01**：给定空数据库，当服务读取赛事数据时，则返回真实赛事、阶段、球队和比赛种子数据。
- **AC-02**：给定管理员创建赛事、阶段、球队和比赛，当重建 Repository 后，则用户侧查询仍能读取这些数据。
- **AC-03**：给定管理员编辑比赛并录入结果，当重建 Repository 后，则用户侧比赛详情展示更新后的状态和比分。
- **AC-04**：给定管理员删除赛事、阶段、球队或比赛，当重建 Repository 后，则用户侧查询不再返回被删除对象。
- **AC-05**：给定仓库提交内容，当检查忽略规则时，则生成 SQLite 数据库文件位于已忽略目录或被忽略模式覆盖。
- **AC-06**：给定当前 HTTP 契约，当持久化实现完成后，则 `npm run check` 仍全部通过。

## 验证映射

| AC    | 验证方式 | 命令或可复现步骤                   | 结果 / 证据                                       |
| ----- | -------- | ---------------------------------- | ------------------------------------------------- |
| AC-01 | 单元测试 | 空临时 SQLite 文件初始化后查询     | `backend/test/football-persistence.test.mts` 通过 |
| AC-02 | 单元测试 | 创建数据后重建 Repository 并查询   | `backend/test/football-persistence.test.mts` 通过 |
| AC-03 | 单元测试 | 编辑比赛、录入结果后重建并查询     | `backend/test/football-persistence.test.mts` 通过 |
| AC-04 | 单元测试 | 删除数据后重建 Repository 并查询   | `backend/test/football-persistence.test.mts` 通过 |
| AC-05 | 静态检查 | 检查 `.gitignore` 和默认数据库路径 | `backend/test/football-persistence.test.mts` 通过 |
| AC-06 | 门禁检查 | `npm run check`                    | 通过                                              |

## 验收记录

- `npm run check`：通过。覆盖格式、lint、类型检查、前端 smoke、后端测试、构建和 Playwright E2E；结果为前端 smoke 10 passed、后端测试 67 passed、E2E 9 passed。
- 人工验收：通过。FootballRepository 使用 SQLite 保存 Competition、Stage、Team、Match 和 Match result；测试通过关闭并重建 Repository 验证数据仍可读取或保持删除状态。
- 已知限制：Prediction、Favorite、Comment 仍为内存存储；它们会在 010 删除 Match 时被清理，但服务重启后不会保留。
