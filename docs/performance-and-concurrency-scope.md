# 性能与竞态资源问题范围说明

## 目标

本文档用于提交“性能问题 + 竞态资源问题处理报告”的第一步：确认分析范围、业务边界、风险点和已有验证覆盖。本文只做问题识别和后续排查计划，不改变用户可见行为、业务规则、HTTP 契约或代码实现。

## 已阅读依据

- `README.md`：确认项目是足球赛事信息与互动预测平台，前端使用 Next.js，后端使用 Midway.js / Koa，数据库使用 SQLite，根级 `npm run check` 是交付门禁。
- `docs/architecture.md`：确认浏览器和 Agent 都必须通过 REST API 调用后端，业务规则、权限、并发控制和数据持久化属于后端 Service 层职责。
- `specs/000-product-overview.md`：确认统一业务模型为 Competition -> Stage -> Match，Prediction、Favorite、Comment 都关联 Match，HTTP 边界以 `contracts/openapi.yaml` 为准。
- `specs/004-score-predictions.md`：确认预测锁定、唯一有效预测和并发写入不变量，尤其是 AC-06 要求同一用户同一比赛并发预测后最多只有一条有效预测。
- `specs/013-football-data-persistence.md`：确认 Competition、Stage、Team、Match 和 Match result 已持久化到 SQLite；Prediction、Favorite、Comment 暂未纳入该持久化范围。
- `contracts/openapi.yaml`：确认预测、收藏、评论、比赛结果录入、积分榜和淘汰赛图等 HTTP 操作及状态码边界。

## 范围边界

- 本报告只分析现有足球平台功能：赛事浏览、阶段浏览、比赛详情、积分榜、淘汰赛图、预测、收藏、评论、管理员数据维护和比赛结果录入。
- 所有足球数据操作必须通过 `contracts/openapi.yaml` 中记录的 REST API 完成，不直接写数据库，不复制服务端业务规则到脚本中。
- 性能问题重点关注高频读接口、无界列表、重复计算、外部 API 阻塞和 SQLite 查询效率。
- 竞态资源问题重点关注共享可变状态、重复提交、唯一性约束、比赛开始时间锁定、管理员写入与关联数据清理。
- 本阶段不新增功能，不改变 OpenAPI 契约，不修改业务规则；后续如发现需要改变 HTTP 行为，应先更新对应 Spec 和 `contracts/openapi.yaml`。

## 性能风险清单

| 风险点                                   | 相关接口或页面                                                 | 影响场景                                                         | 已有覆盖                                                      | 后续排查重点                                                      |
| ---------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| 赛事、阶段、比赛列表可能随数据量增长变慢 | `GET /api/competitions`、`GET /api/stages`、比赛列表相关页面   | 用户打开首页、赛事页或后台管理页时响应变慢                       | 后端测试和 E2E 覆盖可用性，未覆盖大数据量性能                 | 检查是否存在无界返回、全量扫描、缺少过滤或索引                    |
| 比赛详情聚合信息可能重复查询             | `GET /api/matches/{matchId}`、比赛详情页                       | 用户查看单场比赛时，需要同时展示比赛、球队、预测、收藏、评论入口 | E2E 覆盖详情页流程                                            | 检查前端是否重复请求相同资源，后端是否重复映射关联对象            |
| 积分榜计算可能每次请求全量重算           | `GET /api/stages/{stageId}/standings`                          | 联赛或小组赛阶段比赛增多后，榜单响应变慢                         | `backend/test/football.test.mts` 覆盖排序和阶段类型           | 检查计算复杂度、是否只读取目标阶段比赛、是否可缓存或限制范围      |
| 淘汰赛图排序和分组可能随比赛数量变慢     | `GET /api/stages/{stageId}/bracket`                            | 淘汰赛页面加载和排序变慢                                         | `backend/test/football.test.mts` 覆盖 bracket 排序            | 检查是否只处理 KNOCKOUT 阶段，按 round / bracketPosition 稳定排序 |
| 评论列表分页可能仍依赖全量过滤           | `GET /api/matches/{matchId}/comments`                          | 热门比赛评论变多后翻页变慢                                       | `backend/test/comment.test.mts` 覆盖分页和稳定排序            | 检查分页是否在数据层执行，是否有 matchId、createdAt、id 相关索引  |
| 我的预测和我的收藏可能随用户数据增长变慢 | `GET /api/users/me/predictions`、`GET /api/users/me/favorites` | 用户个人中心加载变慢                                             | 预测、收藏后端测试覆盖功能正确性                              | 检查 userId 过滤、倒序排序和唯一关系查询效率                      |
| OpenLigaDB 外部资料可能阻塞球队详情      | 球队详情页、外部球队资料服务                                   | 外部网络慢或失败时拖慢页面                                       | `backend/test/openligadb-client.test.mts` 覆盖客户端行为      | 确认超时、错误降级和本地资料优先策略                              |
| SQLite 文件写入可能成为后台管理瓶颈      | 管理员创建、编辑、删除基础数据和录入结果                       | 管理员批量维护数据时响应变慢                                     | `backend/test/football-persistence.test.mts` 覆盖持久化正确性 | 检查事务边界、索引、写入失败安全错误                              |

## 竞态资源风险清单

| 风险点                        | 相关接口或操作                                                                    | 业务不变量                                      | 已有覆盖                                                       | 后续排查重点                                                   |
| ----------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| 同一用户并发创建预测          | `POST /api/matches/{matchId}/predictions`                                         | 同一用户同一比赛最多一条有效预测                | `specs/004` AC-06 和 `backend/test/prediction.test.mts` 已覆盖 | 检查实现是否具备原子性，后续持久化时需数据库唯一约束或事务     |
| 同一用户并发修改预测          | `PUT /api/matches/{matchId}/prediction`                                           | 新预测成为唯一有效预测，历史预测不可同时有效    | AC-02 覆盖单请求更新，竞态覆盖需补强                           | 增加并发修改测试，确认旧有效预测失效和新预测写入不可交错       |
| 开赛临界点提交预测            | 预测创建和修改接口                                                                | 比赛是否开始必须由服务端根据开始时间判断        | AC-03、AC-04 已覆盖已开始比赛                                  | 检查写入前是否重新读取 Match，避免使用过期前端状态             |
| 重复收藏同一比赛              | `POST /api/matches/{matchId}/favorite`                                            | 重复收藏不产生重复收藏项                        | `specs/007` AC-03 覆盖连续重复收藏                             | 增加并发收藏测试，后续持久化时增加 userId + matchId 唯一约束   |
| 收藏与取消收藏交错提交        | 收藏和取消收藏接口                                                                | 最终状态应与最后成功操作一致，取消收藏幂等      | AC-02、控制器测试覆盖取消收藏                                  | 明确交错请求下的可接受结果和状态码，必要时补充 Spec            |
| 评论发布、编辑、删除并发      | 评论创建、编辑、删除接口                                                          | 评论必须关联存在的 Match，作者权限不能被绕过    | 评论测试覆盖权限、分页、审核                                   | 检查删除与编辑交错、审核与删除交错的结果语义                   |
| 管理员审核评论与用户编辑交错  | `PUT /api/admin/comments/{commentId}/moderation`、`PUT /api/comments/{commentId}` | 管理员审核状态和用户内容更新都不能丢失权限校验  | AC-04、AC-06 分别覆盖                                          | 明确并发下是否需要版本号、最后写入胜出或冲突响应               |
| 管理员录入比赛结果并发        | `PUT /api/admin/matches/{matchId}/result`                                         | 只有管理员可写，结果更新后比赛详情一致          | `backend/test/match-result.test.mts` 覆盖覆盖写入和权限        | 检查并发覆盖写入是否符合业务预期，必要时增加审计或版本控制说明 |
| 删除 Match 与互动数据写入交错 | 管理员删除 Match、预测、收藏、评论                                                | 删除 Match 后关联互动数据应被清理或新写入被拒绝 | `specs/010` 和 `admin-data.service.ts` 已有清理调用            | 检查清理与新写入是否在同一事务边界内，避免孤儿互动数据         |

## 优先级

1. 最高优先级：预测创建和修改的并发安全，因为它已有明确 Spec 不变量和 `409` 冲突语义。
2. 高优先级：收藏重复提交和 Match 删除时关联数据清理，因为它们直接影响用户列表正确性。
3. 高优先级：评论分页和热门比赛评论增长，因为它是最容易出现数据量增长问题的读接口。
4. 中优先级：积分榜和淘汰赛图计算性能，因为当前数据规模可控，但计算逻辑会随比赛数量增长。
5. 中优先级：OpenLigaDB 外部调用降级，因为它影响球队详情页稳定性，但本地资料仍可展示。
6. 中优先级：管理员结果录入并发覆盖，因为当前契约允许覆盖结果，但尚未定义版本冲突语义。

## 第一阶段交付物

- 本文档作为报告第一节“范围说明与风险清单”。
- 后续第二步应进入代码级排查，重点阅读 Service 和 Repository：
  - `backend/src/service/prediction.service.ts`
  - `backend/src/service/favorite.service.ts`
  - `backend/src/service/comment.service.ts`
  - `backend/src/service/football.repository.ts`
  - `backend/src/service/football.service.ts`
  - `backend/src/service/admin-data.service.ts`
  - `backend/src/service/match-result.service.ts`
- 第二步完成后，应把每个风险点标记为“已解决、需补测、需设计变更、暂不处理”。
