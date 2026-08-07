# 010：赛事基础数据管理

> 状态：草案
>
> 关联事项：Web 开发技术课程大作业

## 目标

管理员可以维护赛事、阶段、球队和比赛基础数据，包括新增、编辑和删除。

## 用户故事

作为管理员，我希望管理赛事基础数据，以便为用户提供可浏览和可互动的比赛内容。

## 范围

- 管理 Competition。
- 管理 Stage。
- 管理 Team。
- 管理 Match。
- 支持新增、编辑和删除赛事、球队、比赛。
- 支持淘汰赛 round / bracket 信息录入。
- 管理员权限保护。

## 非目标

- 自动赛事编排。
- 批量导入。
- 复杂审批流。
- 为不同赛制创建独立 Match 管理入口。

## 业务规则

- **BR-01**：只有管理员可以管理赛事基础数据。
- **BR-02**：删除赛事、球队或比赛时，系统必须返回可预期结果；存在业务关联时的删除语义须在 Contract 中明确。
- **BR-03**：Stage 必须属于已存在 Competition。
- **BR-04**：Match 必须属于已存在 Stage，并引用已存在球队。
- **BR-05**：`KNOCKOUT` 比赛可以维护 round / bracket 信息。
- **BR-06**：球队和比赛不要求种子数据；管理员账号要求种子数据。

## Contract 影响

- 结论：新增。
- 理由或影响摘要：需要新增管理员基础数据管理接口，并定义创建、编辑、删除、校验和权限错误。
- OpenAPI operation：`POST /api/admin/competitions`、`PUT /api/admin/competitions/{competitionId}`、`DELETE /api/admin/competitions/{competitionId}`、`POST /api/admin/stages`、`PUT /api/admin/stages/{stageId}`、`DELETE /api/admin/stages/{stageId}`、`POST /api/admin/teams`、`PUT /api/admin/teams/{teamId}`、`DELETE /api/admin/teams/{teamId}`、`POST /api/admin/matches`、`PUT /api/admin/matches/{matchId}`、`DELETE /api/admin/matches/{matchId}`。
- 迁移 / 废弃安排：不适用。

## 验收标准

- **AC-01**：给定管理员，当创建合法赛事、阶段、球队和比赛时，则用户侧浏览接口可以查询到这些数据。
- **AC-02**：给定管理员，当编辑赛事、阶段、球队或比赛时，则用户侧浏览接口展示更新后的数据。
- **AC-03**：给定管理员，当删除允许删除的赛事、球队或比赛时，则用户侧浏览接口不再返回该对象。
- **AC-04**：给定普通用户，当访问任一管理接口时，则响应为无权限错误且不改变数据。
- **AC-05**：给定未认证用户，当访问任一管理接口时，则响应为未认证错误且不改变数据。
- **AC-06**：给定非法阶段类型、缺失关联或非法时间，当管理员提交数据时，则响应为校验错误且不写入数据。

## 验证映射

| AC    | 验证方式  | 命令或可复现步骤                 | 结果 / 证据  |
| ----- | --------- | -------------------------------- | ------------ |
| AC-01 | API / E2E | 管理员创建基础数据后从用户侧查询 | 待实现后填写 |
| AC-02 | API / E2E | 管理员编辑数据后从用户侧查询     | 待实现后填写 |
| AC-03 | API / E2E | 管理员删除数据后从用户侧查询     | 待实现后填写 |
| AC-04 | API Test  | 普通用户访问管理接口             | 待实现后填写 |
| AC-05 | API Test  | 未登录访问管理接口               | 待实现后填写 |
| AC-06 | API Test  | 提交非法管理数据                 | 待实现后填写 |

## 验收记录

- `npm run check`：待执行。
- 人工验收：待执行。
- 已知限制：删除存在业务关联的数据时的具体语义仍需在实现前随 Contract 明确。
