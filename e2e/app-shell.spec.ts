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
