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
