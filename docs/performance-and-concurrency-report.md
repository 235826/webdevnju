# 性能问题与竞态资源问题处理报告

## 背景与边界

本项目是足球赛事信息与互动预测平台，核心模型为 Competition -> Stage -> Match。Prediction、Favorite、Comment 都关联 Match。前端通过 REST API 访问后端，HTTP 边界以 `contracts/openapi.yaml` 为准，业务规则、权限判断、并发控制和数据持久化由后端 Service / Repository 层负责。

本次处理范围只覆盖现有功能：赛事浏览、阶段浏览、比赛详情、积分榜、淘汰赛图、预测、收藏、评论、管理员数据维护和比赛结果录入。所有足球数据操作均通过现有 REST API 语义完成，不直接写数据库，不绕过权限、预测锁定、删除清理或校验规则。

本次整改不改变用户可见行为、不修改 OpenAPI 契约、不新增业务功能；属于性能实现优化、边界测试补强和报告文档整理。

## 问题识别方法

排查依据包括：

- `README.md`：确认项目运行方式、技术栈和 `npm run check` 交付门禁。
- `docs/architecture.md`：确认 REST API 是浏览器和 Agent 的共同业务边界。
- `specs/000-product-overview.md`：确认统一 Match 模型和服务端业务规则边界。
- `specs/004-score-predictions.md`：确认预测锁定和同一用户同一比赛最多一条有效预测的不变量。
- `specs/007-favorites.md`：确认重复收藏不得产生重复收藏项。
- `specs/008-comments-and-discussion.md`：确认评论分页、稳定排序、作者权限和安全错误要求。
- `specs/010-admin-data-management.md`：确认删除 Match 时需要清理预测、收藏和评论。
- `contracts/openapi.yaml`：确认 HTTP 路径、状态码、认证和错误响应边界。

代码排查重点文件：

- `backend/src/service/football.repository.ts`
- `backend/src/service/football.service.ts`
- `backend/src/service/prediction.service.ts`
- `backend/src/service/favorite.service.ts`
- `backend/src/service/comment.service.ts`
- `backend/src/service/admin-data.service.ts`
- `backend/src/service/match-result.service.ts`

## 性能问题处理结果

### 比赛列表查询

发现问题：`FootballRepository.listMatches` 原实现先执行全量 `SELECT * FROM matches ORDER BY starts_at ASC, id ASC`，再在 TypeScript 中按 `competitionId`、`stageId`、`status` 过滤。数据量增长后，这会导致不必要的全量读取、对象映射和关联查询。

处理结果：

- 已将 `competitionId`、`stageId`、`status` 过滤下推到 SQL `WHERE`。
- 保持原排序语义：`starts_at ASC, id ASC`。
- 查询参数仍使用 SQLite prepared statement 参数传入，不拼接用户输入。
- 新增组合索引：
  - `idx_matches_status_starts_at_id`
  - `idx_matches_stage_starts_at_id`

影响范围：只优化查询实现，不改变接口路径、参数、响应体、排序语义或错误语义。

### 评论分页边界

发现问题：评论当前仍使用内存数组，`listMatchComments` 会对完整评论数组执行过滤、排序和 `slice`。这在课程规模内可接受，但热门比赛评论量上升后需要明确分页边界。

处理结果：

- 已保留 `pageSize` 最大 100 的服务端限制。
- 新增 120 条评论分页测试，覆盖：
  - 第一页 `pageSize=100`
  - 第二页剩余数据
  - 越界页返回空数组
  - `pagination.total` 保持正确
  - `pageSize=101` 返回校验错误

当前结论：评论接口已有分页上限和边界测试证据，满足本项目完结范围内的性能处理要求。

### 外部球队资料

OpenLigaDB 外部资料调用已有处理：

- `OpenLigaDbClient` 使用 `AbortSignal.timeout`。
- `TeamExternalProfileService` 提供 5 分钟缓存。
- 外部失败时返回 `UNAVAILABLE`，本地球队资料仍可展示。
- 测试覆盖可用、不可用、无匹配和无效外部 payload。

本次未修改该部分，只在报告中纳入已覆盖项。

## 竞态资源问题处理结果

### 预测并发

业务不变量：同一用户对同一场比赛最多只有一条有效预测；比赛开始后预测被服务端锁定。

已有覆盖：

- 并发创建预测后最多一条有效预测。
- 比赛开始后创建或修改预测返回 `PREDICTION_LOCKED` / `409`。
- 服务端基于 Match `startsAt` 判断锁定，不依赖前端状态。

本次补强：

- 新增并发修改预测测试，覆盖多个并发更新完成后，同一用户同一比赛仍最多一条有效预测。

当前结论：单进程同步执行模型下满足现有规格和本项目完结范围内的并发处理要求。

### 收藏并发

业务不变量：同一用户对同一场比赛最多一个有效收藏；重复收藏不得产生重复项。

已有覆盖：

- 连续重复收藏返回同一收藏关系。
- 取消收藏幂等。
- 未认证写入返回未认证错误。

本次补强：

- 新增并发重复收藏测试，断言同一用户同一比赛只保留一个收藏项，并且并发响应指向同一收藏记录。

当前结论：单进程同步执行模型下满足现有规格和本项目完结范围内的并发处理要求。

### 评论编辑与删除交错

业务不变量：用户只能编辑或删除自己的评论；删除后的评论不能继续被编辑；错误响应不得暴露内部诊断信息。

本次补强：

- 新增删除后再编辑测试，返回 `NOT_FOUND` / `404`。
- 新增编辑后删除测试，删除后评论不再出现在列表。
- 新增删除后非作者编辑/删除测试，返回安全 `NOT_FOUND` / `404`。

当前结论：单进程同步执行模型下有明确边界证据，满足本项目完结范围内的评论编辑和删除处理要求。

### 删除 Match 后互动写入

业务不变量：删除 Match 后，关联 Prediction、Favorite、Comment 应被清理；后续对该 Match 的互动写入应被拒绝。

已有覆盖：

- 删除 Match 后，已有预测、收藏、评论数量归零。

本次补强：

- 删除 Match 后再次收藏返回 `NOT_FOUND` / `404`。
- 删除 Match 后再次预测返回 `NOT_FOUND` / `404`。
- 删除 Match 后再次评论返回 `NOT_FOUND` / `404`。

当前结论：现有内存互动数据和 SQLite 基础数据之间已有清理与拒绝写入证据，满足本项目完结范围内的删除关联处理要求。

## 测试与验证记录

本次新增或扩展的后端测试覆盖：

- `backend/test/prediction.test.mts`
  - 并发修改预测后最多一条有效预测。
- `backend/test/favorite.test.mts`
  - 并发重复收藏同一比赛只保留一条收藏。
- `backend/test/comment.test.mts`
  - 120 条评论分页边界。
  - `pageSize` 最大值校验。
  - 评论删除后编辑、编辑后删除、删除后越权访问。
- `backend/test/admin-data.test.mts`
  - 删除 Match 后预测、收藏、评论新写入均被拒绝。

最终验证结果：

```text
npm run test --workspace backend 通过，71 passed
npm run check 通过
前端 smoke 10 passed
后端测试 71 passed
E2E 13 passed
```

`npm run check` 覆盖格式检查、lint、类型检查、前后端测试、构建和 Playwright E2E。

## 当前边界说明

以下内容用于说明本次处理的项目边界，不影响本报告的验收结论：

- Prediction、Favorite、Comment 当前按现有规格使用进程内数组；本次报告围绕该实现完成并发不变量验证和边界补测。
- 当前并发安全结论基于本项目运行方式和 Node 单进程同步执行模型。
- 赛事、阶段、球队列表保持现有 OpenAPI 契约，不在本次完结范围内新增分页参数。
- 收藏与取消收藏交错、管理员审核评论与用户编辑交错、管理员并发录入比赛结果的版本冲突语义未在现有 OpenAPI 中定义；本次不模拟未定义行为。
- 本次以代码整改和自动化测试作为验证证据，未额外加入查询计划或压测附件。
