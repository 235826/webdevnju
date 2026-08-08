# 009：OpenLigaDB 球队资料集成

> 状态：已验收
>
> 关联事项：Web 开发技术课程大作业

## 目标

平台通过 OpenLigaDB 获取真实球队资料，并在失败时向用户展示降级提示。

## 用户故事

作为赛事观众，我希望看到来自真实业务 API 的球队补充资料，以便获得比本地数据更丰富的球队信息。

## 范围

- 调用免费的 OpenLigaDB 球队资料 API。
- 在球队详情中展示可用的外部资料。
- 外部 API 失败、超时或无匹配时展示降级提示。
- 本地球队资料作为页面基础信息。

## 非目标

- 付费 API 或需要密钥的 API。
- 外部数据完整同步。
- 依赖外部 API 作为平台唯一数据源。
- 自动修正本地球队资料。

## 业务规则

- **BR-01**：外部 API 集成服务于球队资料场景。
- **BR-02**：外部 API 不可用时，不得阻塞本地球队详情展示。
- **BR-03**：降级提示应让用户知道外部资料暂不可用，但不得暴露内部错误堆栈。
- **BR-04**：外部资料与本地球队数据存在差异时，本地数据仍是平台业务关联的权威数据。

## Contract 影响

- 结论：新增。
- 理由或影响摘要：需要在球队详情相关 HTTP 行为中表达外部资料可用、不可用或无匹配状态。
- OpenAPI operation：`GET /api/teams/{teamId}/external-profile` 或 `GET /api/teams/{teamId}` 中的外部资料字段。
- 迁移 / 废弃安排：不适用。

## 验收标准

- **AC-01**：给定本地球队可以匹配 OpenLigaDB 数据，当用户查看球队详情时，则页面展示本地资料和外部补充资料。
- **AC-02**：给定 OpenLigaDB 请求失败或超时，当用户查看球队详情时，则页面展示本地资料和降级提示。
- **AC-03**：给定 OpenLigaDB 没有匹配球队，当用户查看球队详情时，则页面展示本地资料和无外部资料提示。
- **AC-04**：给定外部 API 返回异常结构，当系统处理响应时，则不会向用户暴露内部异常细节。

## 验证映射

| AC    | 验证方式   | 命令或可复现步骤           | 结果 / 证据                                                                                               |
| ----- | ---------- | -------------------------- | --------------------------------------------------------------------------------------------------------- |
| AC-01 | API / E2E  | 准备可匹配球队并查看详情   | `backend/test/team-external-profile.test.mts` 覆盖可用外部资料和缓存                                      |
| AC-02 | API / 组件 | 模拟 OpenLigaDB 失败或超时 | `backend/test/team-external-profile.test.mts` 覆盖 `UNAVAILABLE` 安全降级                                 |
| AC-03 | API / 组件 | 准备无匹配球队并查看详情   | `backend/test/team-external-profile.test.mts` 覆盖 `NO_MATCH`；`e2e/app-shell.spec.ts` 覆盖页面无匹配提示 |
| AC-04 | API Test   | 模拟异常外部响应结构       | `backend/test/team-external-profile.test.mts` 覆盖异常结构不外泄                                          |

## 验收记录

- `npm run check`：通过。
- 人工验收：未执行；由 Playwright E2E 覆盖球队详情降级展示。
- 已知限制：测试不依赖真实 OpenLigaDB 网络；当前种子球队已配置部分真实 `openLigaDbTeamId`，本地展示 `AVAILABLE` 仍依赖运行环境可访问 OpenLigaDB。
