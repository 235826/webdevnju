import { expect, test } from "@playwright/test";

test("AC-05: 首页通过后端正常加载课程列表", async ({ page }) => {
  const coursesResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      response.request().method() === "GET" && url.pathname === "/api/courses"
    );
  });

  await page.goto("/");

  const coursesResponse = await coursesResponsePromise;
  expect(coursesResponse.status()).toBe(200);
  await expect(page.getByRole("status")).toHaveText("API 已连接");

  const courseCards = page.locator("article");
  await expect(courseCards).toHaveCount(3);
  await expect(courseCards.locator("h3")).toHaveText([
    "HTML 与 CSS",
    "React 与 Next.js",
    "API 与数据持久化",
  ]);
  await expect(courseCards.locator("p")).toHaveText([
    "构建语义清晰、响应式且可访问的页面。",
    "理解组件、状态、路由和服务端渲染。",
    "使用 Midway.js、OpenAPI 和 SQLite 完成全栈闭环。",
  ]);
});
