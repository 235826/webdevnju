import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

async function expectNoPageOverflow(page: Page) {
  const hasOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );

  expect(hasOverflow).toBe(false);
}

test("移动端核心浏览页没有页面级横向溢出", async ({ page }) => {
  const paths = [
    { path: "/", heading: "足球赛事信息与互动预测平台" },
    { path: "/competitions", heading: "赛事列表" },
    { path: "/competitions/1", heading: "1. Fußball-Bundesliga 2024/2025" },
    { path: "/matches/1", heading: "比赛详情" },
    { path: "/teams", heading: "球队资料" },
    { path: "/teams/1", heading: "FC Bayern München" },
    { path: "/stages/1/standings", heading: "积分榜" },
    { path: "/stages/2/bracket", heading: "淘汰赛图" },
  ];

  for (const target of paths) {
    await page.goto(target.path);
    await expect(
      page.getByRole("heading", { name: target.heading, exact: true }),
    ).toBeVisible();
    await expectNoPageOverflow(page);
  }
});

test("移动端可完成登录、预测、收藏和评论操作", async ({ page }) => {
  const username = `mobile_${Date.now()}`;
  const createdStartsAt = "2027-08-01T10:00";

  await page.goto("/");
  await page.getByLabel("用户名").fill("admin");
  await page.getByLabel("密码").fill("Admin12345");
  await page.getByRole("button", { name: "登录" }).last().click();
  await expect(page.getByText("已登录为 admin")).toBeVisible();

  await page.goto("/admin/matches");
  await page.locator('select[name="stageId"]').selectOption("1");
  await page.getByLabel("主队").selectOption("1");
  await page.getByLabel("客队").selectOption("6");
  await page.getByLabel("开赛时间").fill(createdStartsAt);
  await page.getByLabel("比赛状态").selectOption("SCHEDULED");
  await page.getByRole("button", { name: "创建比赛" }).click();
  await expect(page.getByText("比赛已创建")).toBeVisible();

  const createdMatchHref = await page
    .getByRole("link", { name: "查看新比赛" })
    .last()
    .getAttribute("href");
  expect(createdMatchHref).toBeTruthy();

  await page.goto("/");
  await page.getByRole("button", { name: "登出" }).click();
  await page.getByRole("button", { name: "注册" }).first().click();
  await page.getByLabel("用户名").fill(username);
  await page.getByLabel("密码").fill("password123");
  await page.getByRole("button", { name: "注册" }).last().click();
  await expect(
    page.getByText(new RegExp(`注册成功，请使用 ${username} 登录`)),
  ).toBeVisible();

  await page.getByLabel("用户名").fill(username);
  await page.getByLabel("密码").fill("password123");
  await page.getByRole("button", { name: "登录" }).last().click();
  await expect(
    page.getByText(new RegExp(`已登录为 ${username}`)),
  ).toBeVisible();
  await expectNoPageOverflow(page);

  await page.goto(createdMatchHref ?? "/matches/1");
  await page.getByLabel("主队进球").fill("1");
  await page.getByLabel("客队进球").fill("1");
  await page.getByRole("button", { name: "提交预测" }).click();
  await expect(page.getByText("当前预测：1 : 1")).toBeVisible();

  await page.getByRole("button", { name: "收藏比赛" }).click();
  await expect(page.getByText("已收藏比赛")).toBeVisible();

  await page.getByLabel("评论内容").fill("移动端评论正常提交");
  await page.getByRole("button", { name: "发表评论" }).click();
  await expect(page.getByText("移动端评论正常提交")).toBeVisible();
  await expectNoPageOverflow(page);
});

test("移动端空状态和错误状态可见且不暴露内部诊断", async ({ page }) => {
  await page.route("**/api/competitions", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [] }),
    });
  });
  await page.goto("/competitions");
  await expect(page.getByText("暂无赛事。")).toBeVisible();
  await expectNoPageOverflow(page);

  await page.unroute("**/api/competitions");
  await page.route("**/api/teams", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [] }),
    });
  });
  await page.goto("/teams");
  await expect(page.getByText("暂无球队。")).toBeVisible();
  await expectNoPageOverflow(page);
  await page.unroute("**/api/teams");

  await page.route("**/api/users/me/favorites", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [] }),
    });
  });
  await page.goto("/me/favorites");
  await expect(page.getByText("暂无收藏。")).toBeVisible();
  await expectNoPageOverflow(page);
  await page.unroute("**/api/users/me/favorites");

  await page.route("**/api/matches/1/comments**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [],
        pagination: { page: 1, pageSize: 5, total: 0 },
      }),
    });
  });
  await page.goto("/matches/1");
  await expect(page.getByText("暂无评论。")).toBeVisible();
  await expectNoPageOverflow(page);
  await page.unroute("**/api/matches/1/comments**");

  await page.route("**/api/competitions", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      headers: { "X-Request-Id": "req-mobile-error" },
      body: JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "移动端错误状态",
        },
        requestId: "req-mobile-error",
      }),
    });
  });
  await page.goto("/competitions");
  const safeError = page.getByRole("alert").filter({
    hasText: "移动端错误状态",
  });
  await expect(safeError).toBeVisible();
  await expect(safeError).not.toContainText(/Error:|SQL|stack/i);
  await expectNoPageOverflow(page);
});

test("移动端后台管理页和榜单页面关键信息可访问", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("用户名").fill("admin");
  await page.getByLabel("密码").fill("Admin12345");
  await page.getByRole("button", { name: "登录" }).last().click();
  await expect(page.getByText("已登录为 admin")).toBeVisible();

  await page.goto("/admin/matches");
  await expect(
    page.getByRole("heading", { name: "后台数据管理" }),
  ).toBeVisible();
  await expect(page.locator('select[name="stageId"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "创建比赛" })).toBeVisible();
  await expectNoPageOverflow(page);

  await page.goto("/stages/1/standings");
  await expect(
    page.getByRole("cell", { name: "Borussia Dortmund" }),
  ).toBeVisible();
  await expectNoPageOverflow(page);

  await page.goto("/stages/2/bracket");
  await expect(page.getByRole("heading", { name: "Endspiel" })).toBeVisible();
  await expect(page.getByText("DSC Arminia Bielefeld")).toBeVisible();
  await expectNoPageOverflow(page);
});
