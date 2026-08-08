import { expect, test } from "@playwright/test";

test("首页展示足球赛事平台骨架并保留 API 检查入口", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "足球赛事信息与互动预测平台" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "检查 API" })).toHaveAttribute(
    "href",
    "/api/health",
  );
});

test("用户可以浏览赛事、阶段和比赛详情", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "浏览赛事" }).click();
  await expect(page.getByRole("heading", { name: "赛事列表" })).toBeVisible();

  await page.getByRole("link", { name: "校园冠军杯" }).click();
  await expect(page.getByRole("heading", { name: "校园冠军杯" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "A 组" })).toBeVisible();

  await page.getByRole("link", { name: /软件学院 vs 人工智能学院/ }).click();
  await expect(page.getByRole("heading", { name: "比赛详情" })).toBeVisible();
  await expect(page.getByText("校园冠军杯 · A 组")).toBeVisible();
  await expect(page.getByText("未开始")).toBeVisible();
});

test("用户可以浏览球队列表、详情，并从比赛详情进入球队资料", async ({
  page,
}) => {
  await page.goto("/");

  await page.getByRole("link", { name: "球队资料" }).click();
  await expect(page.getByRole("heading", { name: "球队资料" })).toBeVisible();

  await page.getByRole("link", { name: /软件学院/ }).click();
  await expect(page.getByRole("heading", { name: "软件学院" })).toBeVisible();
  await expect(page.getByText("外部球队资料暂不可用")).toBeVisible();

  await page.goto("/matches/1");
  await page.getByRole("link", { name: "人工智能学院" }).click();
  await expect(
    page.getByRole("heading", { name: "人工智能学院" }),
  ).toBeVisible();
});

test("登录用户可以提交、修改并查看自己的预测", async ({ page }) => {
  const username = `pw_${Date.now()}`;

  await page.goto("/");
  await page.getByRole("button", { name: "注册" }).first().click();
  await page.getByLabel("用户名").fill(username);
  await page.getByLabel("密码").fill("password123");
  await page.getByRole("button", { name: "注册" }).last().click();
  await expect(
    page.getByText(new RegExp(`注册成功，请使用 ${username} 登录`)),
  ).toBeVisible();

  await page.getByRole("button", { name: "登录" }).first().click();
  await page.getByLabel("用户名").fill(username);
  await page.getByLabel("密码").fill("password123");
  await page.getByRole("button", { name: "登录" }).last().click();
  await expect(
    page.getByText(new RegExp(`已登录为 ${username}`)),
  ).toBeVisible();

  await page.goto("/matches/1");
  await expect(page.getByRole("heading", { name: "我的预测" })).toBeVisible();
  await page.getByLabel("主队进球").fill("2");
  await page.getByLabel("客队进球").fill("1");
  await page.getByRole("button", { name: "提交预测" }).click();
  await expect(page.getByText("当前预测：2 : 1")).toBeVisible();

  await page.getByLabel("主队进球").fill("3");
  await page.getByLabel("客队进球").fill("2");
  await page.getByRole("button", { name: "修改预测" }).click();
  await expect(page.getByText("当前预测：3 : 2")).toBeVisible();

  await page.getByRole("link", { name: "查看我的预测" }).click();
  await expect(page.getByRole("heading", { name: "我的预测" })).toBeVisible();
  await expect(page.getByText("预测比分：3 : 2")).toBeVisible();
});

test("管理员可以录入比赛结果，普通用户看不到结果录入表单", async ({ page }) => {
  const username = `normal_${Date.now()}`;

  await page.goto("/");
  await page.getByRole("button", { name: "注册" }).first().click();
  await page.getByLabel("用户名").fill(username);
  await page.getByLabel("密码").fill("password123");
  await page.getByRole("button", { name: "注册" }).last().click();
  await page.getByRole("button", { name: "登录" }).first().click();
  await page.getByLabel("用户名").fill(username);
  await page.getByLabel("密码").fill("password123");
  await page.getByRole("button", { name: "登录" }).last().click();

  await page.goto("/matches/4");
  await expect(page.getByRole("heading", { name: "比赛详情" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "结果录入" })).toHaveCount(0);

  await page.goto("/");
  await page.getByRole("button", { name: "登出" }).click();
  await page.getByLabel("用户名").fill("admin");
  await page.getByLabel("密码").fill("Admin12345");
  await page.getByRole("button", { name: "登录" }).last().click();
  await expect(page.getByText("已登录为 admin")).toBeVisible();

  await page.goto("/matches/4");
  await expect(page.getByRole("heading", { name: "结果录入" })).toBeVisible();
  await page.getByLabel("主队比分").fill("4");
  await page.getByLabel("客队比分").fill("2");
  await page.getByRole("button", { name: "保存结果" }).click();
  await expect(page.getByText("比赛结果已保存")).toBeVisible();
  await expect(page.getByText("4 : 2")).toBeVisible();
  await expect(page.getByText("已结束")).toBeVisible();
});

test("登录用户可以收藏、查看并取消收藏比赛", async ({ page }) => {
  const username = `favorite_${Date.now()}`;

  await page.goto("/");
  await page.getByRole("button", { name: "注册" }).first().click();
  await page.getByLabel("用户名").fill(username);
  await page.getByLabel("密码").fill("password123");
  await page.getByRole("button", { name: "注册" }).last().click();
  await page.getByRole("button", { name: "登录" }).first().click();
  await page.getByLabel("用户名").fill(username);
  await page.getByLabel("密码").fill("password123");
  await page.getByRole("button", { name: "登录" }).last().click();
  await expect(
    page.getByText(new RegExp(`已登录为 ${username}`)),
  ).toBeVisible();

  await page.goto("/me/favorites");
  await expect(page.getByRole("heading", { name: "我的收藏" })).toBeVisible();
  await expect(page.getByText("暂无收藏。")).toBeVisible();

  await page.goto("/matches/1");
  await page.getByRole("button", { name: "收藏比赛" }).click();
  await expect(page.getByText("已收藏比赛")).toBeVisible();

  await page.getByRole("link", { name: "查看我的收藏" }).click();
  await expect(page.getByText("软件学院 vs 人工智能学院")).toBeVisible();

  await page.getByRole("link", { name: /软件学院 vs 人工智能学院/ }).click();
  await page.getByRole("button", { name: "取消收藏" }).click();
  await expect(page.getByText("已取消收藏")).toBeVisible();

  await page.goto("/me/favorites");
  await expect(page.getByText("暂无收藏。")).toBeVisible();
});

test("用户可以查看积分榜和淘汰赛图", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("用户名").fill("admin");
  await page.getByLabel("密码").fill("Admin12345");
  await page.getByRole("button", { name: "登录" }).last().click();
  await expect(page.getByText("已登录为 admin")).toBeVisible();

  await page.goto("/matches/1");
  await page.getByLabel("主队比分").fill("2");
  await page.getByLabel("客队比分").fill("0");
  await page.getByRole("button", { name: "保存结果" }).click();
  await expect(page.getByText("比赛结果已保存")).toBeVisible();

  await page.goto("/competitions/1");
  await page.getByRole("link", { name: "查看积分榜" }).click();
  await expect(page.getByRole("heading", { name: "积分榜" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "A 组" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "软件学院" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "3" }).last()).toBeVisible();

  await page.goto("/competitions/1");
  await page.getByRole("link", { name: "查看淘汰赛图" }).click();
  await expect(page.getByRole("heading", { name: "淘汰赛图" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "半决赛" })).toBeVisible();
  await expect(page.getByText("软件学院")).toBeVisible();
  await expect(page.getByText("电子工程学院")).toBeVisible();
});
