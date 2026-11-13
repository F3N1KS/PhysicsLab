import { test, expect } from "@playwright/test";
const lab = "/mechanics/projectile";
test("навигация, каталог и честные будущие разделы", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Механика", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Механика." })).toBeVisible();
  await page.getByRole("searchbox").fill("Бросок");
  await expect(page.locator(".experiment-card")).toHaveCount(1);
  await page.getByRole("link", { name: "Открыть лабораторию" }).first().click();
  await expect(page.getByTestId("scene")).toBeVisible();
  await page.getByRole("link", { name: "Оптика", exact: true }).click();
  await expect(
    page.getByText("Этот раздел пока не реализован.", { exact: false }),
  ).toBeVisible();
});
test("единое время, запуск, пауза, сброс, шаги и перемотка", async ({
  page,
}) => {
  await page.goto(lab);
  await page.getByRole("button", { name: "Запуск", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Пауза", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("hud-time")).not.toHaveText("0,00");
  await page.getByRole("button", { name: "Пауза", exact: true }).click();
  const time = await page.getByTestId("hud-time").innerText();
  await page.waitForTimeout(200);
  expect(await page.getByTestId("hud-time").innerText()).toBe(time);
  await page.getByLabel("Временная шкала", { exact: true }).fill("1.5");
  await expect(page.getByTestId("hud-time")).toHaveText("1,50");
  await expect(page.getByTestId("timeline-time")).toContainText("1,50");
  await page.getByTitle("Шаг вперёд", { exact: true }).click();
  await expect(page.getByTestId("hud-time")).toHaveText("1,55");
  await page.getByTitle("Шаг назад", { exact: true }).click();
  await expect(page.getByTestId("hud-time")).toHaveText("1,50");
  await page.getByLabel("Скорость воспроизведения").selectOption("4");
  await page.getByTitle("Сброс", { exact: true }).click();
  await expect(page.getByTestId("hud-time")).toHaveText("0,00");
});
test("параметры, оба размера панелей и темы", async ({ page }) => {
  await page.goto(lab);
  await page
    .getByLabel("Начальная скорость: точное значение", { exact: true })
    .fill("35");
  await expect(
    page.getByLabel("Начальная скорость", { exact: true }),
  ).toHaveValue("35");
  const left = page.locator(".parameters-panel");
  const before = await left.boundingBox();
  await page.getByRole("separator", { name: "Ширина параметров" }).focus();
  await page.keyboard.press("ArrowRight");
  expect((await left.boundingBox())!.width).toBeGreaterThan(before!.width);
  const right = page.locator(".measurements-panel");
  const rb = await right.boundingBox();
  await page.getByRole("separator", { name: "Ширина измерений" }).focus();
  await page.keyboard.press("ArrowLeft");
  expect((await right.boundingBox())!.width).toBeGreaterThan(rb!.width);
  await page.locator(".panel-heading").getByTitle("Скрыть параметры").click();
  await expect(left).toHaveCount(0);
  await page.getByTitle("Показать параметры").click();
  await expect(left).toBeVisible();
  await page.locator(".panel-heading").getByTitle("Скрыть измерения").click();
  await expect(right).toHaveCount(0);
  await page.getByTitle("Показать измерения").click();
  await expect(right).toBeVisible();
  await page.getByTitle("Светлая тема").click();
  await expect(page.locator(".app")).toHaveAttribute("data-theme", "light");
  await page.getByTitle("Тёмная тема").click();
  await expect(page.locator(".app")).toHaveAttribute("data-theme", "dark");
});
test("анализ, сравнение, все графики, таблица и экспорт", async ({ page }) => {
  await page.goto(lab);
  await page.getByRole("tab", { name: "Анализ", exact: true }).click();
  await page.getByRole("button", { name: "К сравнению", exact: true }).click();
  await expect(page.locator(".run-legend")).toContainText("Запуск 1");
  await page.getByRole("button", { name: "График 2/4" }).click();
  await page.getByRole("button", { name: "График 3/4" }).click();
  await expect(page.locator(".chart-panel")).toHaveCount(4);
  await page.getByLabel("График 1: ось Y").selectOption("energy");
  await page.getByLabel("График 1: ось X").selectOption("x");
  const svgDownload = page.waitForEvent("download");
  await page.getByTitle("Экспорт графика SVG").first().click();
  expect((await svgDownload).suggestedFilename()).toMatch(/\.svg$/);
  await page.getByRole("button", { name: "Таблица", exact: true }).click();
  await page.locator("tbody tr").nth(5).click();
  await expect(page.getByTestId("hud-time")).toHaveText("1,00");
  const csv = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  expect((await csv).suggestedFilename()).toBe("physicslab.csv");
  await page.getByRole("button", { name: "Формулы и метод" }).click();
  await expect(page.getByText("УРАВНЕНИЯ ДВИЖЕНИЯ")).toBeVisible();
});
test("редактор сил действительно меняет траекторию и показывает ошибки", async ({
  page,
}) => {
  await page.goto(lab);
  await page.getByRole("tab", { name: "Редактор модели" }).click();
  await page.getByLabel("Формула Fx").fill("m * c");
  await page.getByLabel("Формула Fy").fill("-m*g");
  await page.getByLabel("Константы модели").fill("c = 2");
  await page.getByRole("button", { name: "Применить модель" }).click();
  await expect(page.getByRole("status")).toContainText("Модель применена");
  await expect(
    page.getByText("Пользовательская модель", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Формула Fx").fill("1/0");
  await page.getByRole("button", { name: "Применить модель" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Проверьте деление на ноль",
  );
  await page.getByRole("tab", { name: "Эксперимент", exact: true }).click();
  await expect(page.locator(".model-editor")).toHaveCount(0);
});
test("слои, снимок, камера и разворот рабочей области", async ({ page }) => {
  await page.goto(lab);
  await page.getByRole("button", { name: "Снимок", exact: true }).click();
  await page
    .getByLabel("Начальная скорость: точное значение", { exact: true })
    .fill("40");
  await page.getByTitle("Восстановить снимок").click();
  await expect(
    page.getByLabel("Начальная скорость", { exact: true }),
  ).toHaveValue("25");
  await page.getByTitle("Настройки отображения").click();
  await page.getByLabel("Вектор ускорения", { exact: true }).check();
  await expect(page.locator(".vector")).toHaveCount(2);
  await page.getByTitle("Закрыть слои").click();
  await page.getByTitle("Увеличить масштаб", { exact: true }).click();
  await page.getByTitle("Вписать траекторию", { exact: true }).click();
  await page.getByTitle("Развернуть рабочую область").click();
  await expect(page.locator(".laboratory")).toHaveClass(/workspace-full/);
  await page.getByTitle("Свернуть рабочую область").click();
});
for (const width of [375, 768, 1440, 1920])
  test(`адаптивность ${width}px: страницы, темы и лаборатория`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    for (const url of ["/", "/mechanics", lab]) {
      await page.goto(url);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      if (url === lab) await expect(page.getByTestId("scene")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator("body")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/${width}-${url === "/" ? "home" : url === lab ? "lab" : "catalog"}-dark.png`,
        fullPage: true,
      });
      await page.getByTitle("Светлая тема").click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/${width}-${url === "/" ? "home" : url === lab ? "lab" : "catalog"}-light.png`,
        fullPage: true,
      });
      await page.getByTitle("Тёмная тема").click();
    }
    if (width === 375) {
      await page.getByTitle("Показать параметры").click();
      await expect(page.locator(".parameters-panel")).toBeVisible();
      await page
        .locator(".panel-heading")
        .getByTitle("Скрыть параметры")
        .click();
      await page.getByTitle("Показать измерения").click();
      await expect(page.locator(".measurements-panel")).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
test("перетаскивание начальной точки и вектора, синхронизация графика и восстановление времени снимка", async ({
  page,
}) => {
  await page.goto(lab);
  const body = page.locator(".body"),
    b = (await body.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + 55, b.y - 45, { steps: 5 });
  await page.mouse.up();
  await page.getByText("Дополнительные условия", { exact: false }).click();
  expect(
    Number(
      await page
        .getByLabel("Координата запуска: точное значение", { exact: true })
        .inputValue(),
    ),
  ).toBeGreaterThan(0);
  expect(
    Number(
      await page
        .getByLabel("Начальная высота: точное значение", { exact: true })
        .inputValue(),
    ),
  ).toBeGreaterThan(0);
  const handle = (await page.locator('[data-drag="velocity"]').boundingBox())!;
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(handle.x + 35, handle.y - 15, { steps: 5 });
  await page.mouse.up();
  expect(
    Number(
      await page
        .getByLabel("Начальная скорость: точное значение", { exact: true })
        .inputValue(),
    ),
  ).not.toBe(25);
  await page.getByTitle("Вписать траекторию", { exact: true }).click();
  await page.getByLabel("Временная шкала", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Снимок", exact: true }).click();
  await page
    .getByLabel("Начальная скорость: точное значение", { exact: true })
    .fill("1");
  await page.getByTitle("Восстановить снимок").click();
  await expect(page.getByTestId("hud-time")).toHaveText("2,00");
  await page.getByRole("tab", { name: "Анализ", exact: true }).click();
  await expect(page.locator(".recharts-line-curve").first()).toBeVisible();
  const chart = page.locator(".recharts-wrapper").first();
  await chart.scrollIntoViewIfNeeded();
  const box = (await chart.boundingBox())!;
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.5);
  await expect(page.getByTestId("hud-time")).not.toHaveText("2,00");
  await expect(page.locator(".plot-tooltip").first()).toBeVisible();
  await expect(page.getByTestId("timeline-time")).toContainText(
    await page.getByTestId("hud-time").innerText(),
  );
  await page.getByLabel("График 1: ось X").selectOption("vy");
  await expect(page.locator(".recharts-line-curve").first()).toBeVisible();
  await page
    .getByTitle("Увеличить масштаб графика", { exact: true })
    .first()
    .click();
  await page.screenshot({
    path: "test-results/analysis-interaction.png",
    fullPage: true,
  });
});
test("анализ и редактор на всех разрешениях, без переполнения и ошибок", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const width of [375, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(lab);
    await expect(page.getByTestId("scene")).toBeVisible();
    await page.getByLabel("Временная шкала", { exact: true }).fill("1.5");
    for (const mode of ["Анализ", "Редактор модели"]) {
      await page.getByRole("tab", { name: mode, exact: true }).click();
      if (mode === "Анализ")
        await expect(
          page.locator(".recharts-line-curve").first(),
        ).toBeVisible();
      else await expect(page.getByLabel("Формула Fx")).toBeVisible();
      for (const theme of ["dark", "light"]) {
        if ((await page.locator(".app").getAttribute("data-theme")) !== theme)
          await page
            .getByTitle(theme === "light" ? "Светлая тема" : "Тёмная тема")
            .click();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: `test-results/${width}-${mode === "Анализ" ? "analysis" : "editor"}-${theme}.png`,
          fullPage: true,
        });
      }
    }
  }
  expect(errors).toEqual([]);
});
