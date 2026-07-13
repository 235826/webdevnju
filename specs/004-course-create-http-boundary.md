# 004：课程创建 HTTP 边界

> 状态：已验收  
> 关联事项：现有 `POST /api/courses` 接口的错误与追踪语义对齐

## 目标

课程创建接口在成功、校验失败和未预期失败时都返回稳定、可追踪且不泄露内部实现的 HTTP 响应。

## 用户故事

作为一个调用课程创建接口的客户端，我希望稳定收到可区分的错误代码和请求追踪 ID，以便正确处理失败并定位问题。

## 范围

- 为现有 `POST /api/courses` 补齐统一的 `X-Request-Id` 响应头语义。
- 为现有 `POST /api/courses` 补齐稳定的 `400`/`500` JSON 错误结构。
- 保持当前成功状态码与成功响应结构不变。
- 为错误与追踪行为补充可重复的 API 验证。

## 非目标

- 不调整 `POST /api/courses` 的成功状态码为 `201`。
- 不新增前端课程创建表单。
- 不扩展课程字段、权限、幂等键或并发写入语义。
- 不改变现有课程创建输入校验规则本身。

## 业务规则

- **BR-01**：`POST /api/courses` 成功时继续返回 `200` 和 `{ "data": Course }`，并额外包含非空 `X-Request-Id` 响应头。
- **BR-02**：客户端可以自带符合 `^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$` 的 `X-Request-Id`；若缺失或不合法，服务端生成新的请求 ID。
- **BR-03**：请求体不符合现有课程数据规则时，服务端返回 `400`、错误代码 `VALIDATION_FAILED`，并在错误体中返回与响应头一致的 `requestId`。
- **BR-04**：课程创建发生未预期错误时，服务端返回 `500`、错误代码 `INTERNAL_ERROR`，错误体不得包含 SQL、堆栈、数据库路径或密钥。
- **BR-05**：服务端为课程创建请求记录日志，日志中的 `requestId` 与对应响应头和错误体保持一致。

## Contract 影响

- 结论：变更。
- 理由或影响摘要：现有 `POST /api/courses` 新增 `X-Request-Id` 头部语义，并为 `400`/`500` 补齐统一错误 Schema；成功 JSON 结构保持不变。
- OpenAPI operation：`POST /api/courses`（`createCourse`）。
- 迁移 / 废弃安排：无；旧客户端仍可继续按原请求体调用，若依赖旧 `400` 响应结构则需按新错误体适配。

## 验收标准

- **AC-01**：给定合法的课程创建请求，当请求 `POST /api/courses` 时，响应为 `200`、返回创建后的课程数据，并包含非空 `X-Request-Id` 响应头。
- **AC-02**：给定不符合课程数据规则的请求体，当请求 `POST /api/courses` 时，响应为 `400`、错误代码为 `VALIDATION_FAILED`，且错误体中的 `requestId` 与 `X-Request-Id` 响应头一致。
- **AC-03**：给定客户端提供合法的 `X-Request-Id`，当课程创建请求失败时，服务端沿用该值写入响应头、错误体与日志。
- **AC-04**：给定课程创建发生未预期错误，当请求 `POST /api/courses` 时，响应为 `500` 和 `INTERNAL_ERROR`，错误体不包含 SQL、堆栈或数据库路径。

## 验证映射

| AC    | 验证方式            | 命令或可复现步骤                                                                      | 结果 / 证据 |
| ----- | ------------------- | ------------------------------------------------------------------------------------- | ----------- |
| AC-01 | API Test            | 运行 `npm run test --workspace backend`，断言成功创建响应与 `X-Request-Id`            | 已通过      |
| AC-02 | API / Contract Test | 运行 `npm run test --workspace backend`，覆盖无效请求体的 `400` 错误结构              | 已通过      |
| AC-03 | API / 日志断言 Test | 运行 `npm run test --workspace backend`，断言自带 `X-Request-Id` 在失败响应中保持一致 | 已通过      |
| AC-04 | 故障注入 API Test   | 运行 `npm run test --workspace backend`，模拟创建异常并断言安全 `500` 响应            | 已通过      |

## 验收记录

- `npm run check`：待本次改动验证完成后记录。
- 人工验收：不适用。
- 已知限制：当前 `POST /api/courses` 仍返回 `200`；若后续改为 REST 风格的 `201`，需先更新本 Spec 与 Contract。
