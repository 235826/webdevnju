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
