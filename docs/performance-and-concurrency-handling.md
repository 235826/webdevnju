# 性能与竞态资源问题处理矩阵

## 目标

本文档承接 `docs/performance-and-concurrency-scope.md`，记录代码级排查结果、当前处理状态和后续修复建议。本文是报告第二步产物，只整理现有实现和风险判断，不改变外部行为、HTTP 契约或业务规则。

## 状态定义

- 已覆盖：现有实现和测试已经能支撑当前规格要求。
- 需补测：现有实现方向合理，但缺少并发、边界或性能测试证据。
- 需修复：代码存在明确性能问题、竞态风险或与规格不一致的行为。
- 需设计变更：需要先更新 Spec 或 OpenAPI，再进入实现。
- 暂不处理：当前课程规模内可接受，但需要在报告中说明限制。

## 性能处理矩阵

| 编号 | 风险点                                                                                 | 当前状态   | 代码证据                                                                                                                                                  | 测试证据                                                                                                              | 处理建议                                                                                       |
| ---- | -------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| P-01 | `listMatches` 先全量读取比赛，再在 TypeScript 中按 competitionId、stageId、status 过滤 | 已修复     | `backend/src/service/football.repository.ts` 的 `listMatches` 已将 competitionId、stageId、status 下推到 SQL `WHERE`，并保持 `starts_at ASC, id ASC` 排序 | `backend/test/football.test.mts` 覆盖过滤结果正确性；`npm run check` 覆盖回归                                         | 已增加 status / stage + startsAt / id 相关索引；后续如要继续量化，可增加查询计划或压测记录     |
| P-02 | 赛事、阶段、球队列表无分页                                                             | 需设计变更 | `listCompetitions`、`listStages`、`listTeams` 返回完整数组                                                                                                | 现有测试只覆盖列表可用性和排序                                                                                        | 如果报告要求处理大规模数据，应先在 Spec 和 OpenAPI 增加分页参数；课程规模内可说明暂不扩展      |
| P-03 | 积分榜每次请求实时计算目标阶段比赛                                                     | 暂不处理   | `FootballService.getStageStandings` 读取目标 stage 的 matches 后计算积分                                                                                  | `backend/test/football.test.mts` 覆盖排名、分组和不支持阶段错误                                                       | 当前阶段数据规模小，实时计算可解释且简单；后续若比赛量增大，可缓存阶段榜单或只在结果变更后重算 |
| P-04 | 淘汰赛图每次请求实时排序和分组                                                         | 暂不处理   | `FootballService.getStageBracket` 对目标 stage 的 matches 按 bracketPosition 和 id 排序                                                                   | `backend/test/football.test.mts` 覆盖淘汰赛排序                                                                       | 当前数据量小，保持实时计算；后续可在 Repository 层按 `stage_id, bracket_position, id` 排序     |
| P-05 | 评论分页先过滤和排序完整内存数组，再 slice                                             | 已覆盖     | `CommentService.listMatchComments` 对 `comments` 执行 filter、sort、slice；pageSize 最大 100                                                              | 已新增 `backend/test/comment.test.mts` 大数量分页边界测试，覆盖 120 条评论、pageSize 100、越界页和 pageSize 校验      | 当前有 pageSize 上限和测试证据，但内存数组不适合热门比赛；后续持久化评论时把分页下推到数据库   |
| P-06 | 我的预测和我的收藏按用户过滤完整内存数组                                               | 暂不处理   | `PredictionService.listMyPredictions`、`FavoriteService.listMyFavorites` 过滤全局数组后排序                                                               | 预测、收藏测试覆盖正确性                                                                                              | 当前互动数据未持久化且规模小；后续持久化时增加 `user_id` 索引和按用户查询                      |
| P-07 | OpenLigaDB 外部资料请求可能拖慢球队详情                                                | 已覆盖     | `OpenLigaDbClient` 使用 `AbortSignal.timeout`，`TeamExternalProfileService` 有 5 分钟缓存和失败降级                                                       | `backend/test/openligadb-client.test.mts`、`backend/test/team-external-profile.test.mts` 覆盖可用、不可用和无匹配场景 | 保持现状；报告中说明本地球队资料优先，外部失败不暴露内部诊断                                   |
| P-08 | SQLite 关联字段索引覆盖不完整                                                          | 已修复     | schema 已有 `idx_stages_competition_id`、`idx_matches_stage_id`、home/away team 索引；本轮新增 status + startsAt + id、stageId + startsAt + id 组合索引   | 持久化测试覆盖数据正确性；`npm run check` 覆盖 schema 初始化回归                                                      | 后续如要继续量化，可增加查询计划或性能测试确认索引命中                                         |

## 竞态资源处理矩阵

| 编号 | 风险点                                                    | 当前状态   | 代码证据                                                                                                                       | 测试证据                                                                                              | 处理建议                                                                                         |
| ---- | --------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| C-01 | 同一用户并发创建预测                                      | 已覆盖     | `PredictionService.createActivePrediction` 先将同一 userId + matchId 的有效预测置为 inactive，再 push 新预测                   | `backend/test/prediction.test.mts` 的 AC-06 覆盖并发创建后最多一条有效预测                            | 当前 Node 单进程同步模型下满足规格；后续持久化或多实例部署时必须加数据库事务和唯一有效预测约束   |
| C-02 | 同一用户并发修改预测                                      | 已覆盖     | `updateMyPrediction` 复用 `createActivePrediction`，与创建路径共享唯一有效预测逻辑                                             | 已新增 `backend/test/prediction.test.mts` 并发修改测试，断言同一用户同一比赛最多一条有效预测          | 当前单进程同步模型下满足规格；后续持久化或多实例部署时仍需数据库事务和唯一有效预测约束           |
| C-03 | 开赛临界点提交预测                                        | 已覆盖     | `createMyPrediction` 和 `updateMyPrediction` 均通过 `requireMatch` 读取服务端 Match 后调用 `assertMatchPredictable`            | AC-03、AC-04 覆盖已开始比赛拒绝，返回 `PREDICTION_LOCKED` / `409`                                     | 保持服务端锁定判断；后续若支持比赛时间变更，需新增 Spec 定义重新锁定策略                         |
| C-04 | 重复收藏同一比赛                                          | 已覆盖     | `FavoriteService.favoriteMatch` 先 `findFavorite`，存在则返回同一收藏，不 push 新记录                                          | 已新增 `backend/test/favorite.test.mts` 并发重复收藏测试，断言只保留一个收藏项                        | 当前单进程同步模型下满足规格；后续持久化时增加 `user_id + match_id` 唯一约束                     |
| C-05 | 收藏与取消收藏交错                                        | 需设计变更 | `unfavoriteMatch` 幂等删除第一条匹配记录，`favoriteMatch` 返回或新增记录                                                       | 只覆盖单次取消和幂等取消                                                                              | 当前 OpenAPI 未定义交错请求的最终状态。若要严格处理，需要 Spec 定义“最后成功写入胜出”或冲突策略  |
| C-06 | 评论发布、编辑、删除并发                                  | 已覆盖     | `CommentService` 直接修改或 splice 内存数组；权限检查在修改前执行                                                              | 已新增 `backend/test/comment.test.mts` 编辑/删除交错测试，覆盖删除后编辑、编辑后删除、删除后越权访问  | 当前单进程同步模型下有边界证据；后续持久化时使用单条 UPDATE/DELETE 的 affected rows 判断资源状态 |
| C-07 | 管理员审核评论与用户编辑交错                              | 需设计变更 | 审核修改 moderationStatus 和 visible；用户编辑只修改 content 和 updatedAt                                                      | AC-04、AC-06 分别覆盖编辑和审核                                                                       | 需要先定义并发写入策略，例如最后写入胜出、字段级合并或版本冲突                                   |
| C-08 | 管理员录入比赛结果并发覆盖                                | 需设计变更 | `MatchResultService.updateMatchResult` 直接覆盖比分并设置状态 FINISHED                                                         | `backend/test/match-result.test.mts` 覆盖管理员覆盖已有结果                                           | 当前契约允许覆盖结果，未定义版本冲突；如要求防止覆盖，应先新增版本号或条件更新契约               |
| C-09 | 删除 Match 与互动数据写入交错                             | 已覆盖     | `AdminDataService.deleteMatch` 先删除 Match，再调用 `deleteMatchRelations` 清理预测、收藏、评论；互动写入前都会 `requireMatch` | 已扩展 `backend/test/admin-data.test.mts`，覆盖删除后预测、收藏、评论新写入均返回 `NOT_FOUND` / `404` | 当前清理不在统一数据库事务内，且互动数据为内存数组；后续持久化时使用外键级联或事务               |
| C-10 | 删除 Competition、Stage、Team 时关联 Match 与互动数据清理 | 已覆盖     | 删除前先收集 matchIds，Repository 依赖外键级联删除基础数据，再清理互动数组                                                     | `backend/test/admin-data.test.mts` 覆盖删除比赛关联数据，持久化测试覆盖基础数据删除                   | 保持 REST API 边界；后续把互动数据持久化后，应改为数据库外键或事务级联                           |

## 代码排查结论

当前实现对课程规模和单进程运行是可用的：预测并发创建与修改、预测锁定、重复收藏与并发收藏、评论分页边界、评论编辑删除交错、管理员权限和删除清理都有测试覆盖。主要问题不是功能不可用，而是“规模扩大或部署形态变化后”的保障不足。

首轮已修复的性能点是 `FootballRepository.listMatches`：过滤条件已下推到 SQL，schema 也补充了面向 status 和 stage 排序查询的组合索引。

首轮和第二轮已补强的竞态证据包括收藏并发、预测并发修改、评论编辑删除交错，以及 Match 删除后互动写入拒绝。仍需注意：互动数据当前使用内存数组，后续持久化或多实例部署时需要数据库级唯一约束、外键、版本控制或事务语义。

## 后续执行顺序

1. 如需要处理 C-05、C-07、C-08，先更新对应 Spec 和 OpenAPI，定义版本冲突或最后写入策略。
2. 后续持久化 Prediction、Favorite、Comment 时，增加数据库唯一约束、外键级联和事务边界。
3. 如课程报告要求量化性能收益，可补充 `listMatches` 查询计划或小规模压测记录。

## 对报告的建议表述

- 已处理项：比赛列表 SQL 过滤下推、预测锁定、预测并发创建与修改、重复收藏与并发收藏、评论分页边界、评论编辑删除交错、外部 API 超时降级、基础数据持久化和基础数据外键级联。
- 待修复项：互动数据持久化后的唯一约束和事务。
- 待补测项：如需量化性能收益，可补充查询计划或压测记录。
- 暂不处理项：赛事、阶段、球队列表分页，除非课程验收要求大规模数据。
