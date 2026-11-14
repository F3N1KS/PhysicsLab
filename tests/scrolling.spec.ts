import { test, expect } from "@playwright/test";
for (const route of ["/", "/mechanics"])
  test(`колесо естественно прокручивает ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 500 });
    await page.goto(route);
    await page.mouse.move(400, 350);
    await page.mouse.wheel(0, 200);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  });
test("цикл и скорость сохраняются при переходе через конец полёта", async ({
  page,
}) => {
  await page.goto("/mechanics/projectile");
  await page.getByLabel("Скорость воспроизведения").selectOption("4");
  await page.getByTitle("Повторять воспроизведение", { exact: true }).click();
  await page.getByLabel("Временная шкала", { exact: true }).fill("3.55");
  await page.getByRole("button", { name: "Запуск", exact: true }).click();
  await expect
    .poll(async () =>
      Number(await page.locator(".scene > svg").getAttribute("data-time")),
    )
    .toBeLessThan(1);
  await expect(
    page.getByRole("button", { name: "Пауза", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Пауза", exact: true }).click();
  expect(
    Number(await page.locator(".scene > svg").getAttribute("data-time")),
  ).toBeGreaterThan(0);
});
test.describe("сенсорная прокрутка", () => {
  test.use({
    viewport: { width: 375, height: 667 },
    hasTouch: true,
    isMobile: true,
  });
  for (const route of ["/", "/mechanics", "/mechanics/projectile"])
    test(`свайп страницы ${route}`, async ({ page }) => {
      await page.goto(route);
      if (route.includes("projectile")) {
        await page.getByRole("tab", { name: "Анализ", exact: true }).click();
        await page.locator(".chart-area").first().scrollIntoViewIfNeeded();
      }
      const before = await page.evaluate(() => scrollY),
        cdp = await page.context().newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: 185, y: 560 }],
      });
      for (let y = 520; y >= 220; y -= 40)
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: 185, y }],
        });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await expect
        .poll(() => page.evaluate(() => scrollY))
        .toBeGreaterThan(before);
    });
});
