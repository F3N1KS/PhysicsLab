import { test, expect } from "@playwright/test";
import type { Locator, CDPSession } from "@playwright/test";

const lab = "/mechanics/projectile";
const surfaceOf = (page: import("@playwright/test").Page) =>
  page.locator(".scene > svg");
async function camera(surface: Locator) {
  return surface.evaluate((element) => {
    const svg = element as SVGSVGElement;
    return {
      x: Number(svg.dataset.cameraX),
      y: Number(svg.dataset.cameraY),
      scale: Number(svg.dataset.scale),
      w: svg.viewBox.baseVal.width,
      h: svg.viewBox.baseVal.height,
    };
  });
}

test("HUD: направления вправо, влево, вверх, вниз и нулевая скорость", async ({
  page,
}) => {
  await page.goto(lab);
  await page
    .getByLabel("Начальная высота: точное значение", { exact: true })
    .fill("10");
  await page
    .getByLabel("Начальная скорость: точное значение", { exact: true })
    .fill("10");
  for (const [angle, x, y] of [
    [0, "0,00", "90,00"],
    [180, "180,00", "90,00"],
    [90, "90,00", "0,00"],
    [-90, "90,00", "180,00"],
  ]) {
    await page
      .getByLabel("Угол броска: точное значение", { exact: true })
      .fill(String(angle));
    await expect(page.getByTestId("hud-angle-Ox")).toHaveText(`${x} °`);
    await expect(page.getByTestId("hud-angle-Oy")).toHaveText(`${y} °`);
  }
  await page
    .getByLabel("Начальная скорость: точное значение", { exact: true })
    .fill("0");
  await expect(page.getByTestId("hud-angle-Ox")).toHaveText("—");
  await expect(page.getByTestId("hud-angle-Oy")).toHaveText("—");
  await page.getByTitle("Шаг вперёд", { exact: true }).click();
  await expect(page.getByTestId("hud-angle-Ox")).toHaveText("90,00 °");
  await expect(page.getByTestId("hud-angle-Oy")).toHaveText("180,00 °");
});

test("угловые графики: только время, сравнение, курсор, экспорт и отсутствие нулевого вектора", async ({
  page,
}) => {
  await page.goto(lab);
  await page.getByRole("tab", { name: "Анализ", exact: true }).click();
  await page.getByRole("button", { name: "К сравнению", exact: true }).click();
  await page.getByLabel("График 1: ось X").selectOption("vx");
  await page.getByLabel("График 1: ось Y").selectOption("thetaX");
  await page.getByLabel("График 2: ось Y").selectOption("thetaY");
  for (const index of [1, 2]) {
    await expect(page.getByLabel(`График ${index}: ось X`)).toHaveValue("t");
    await expect(page.getByLabel(`График ${index}: ось X`)).toBeDisabled();
    await expect(
      page
        .locator(".chart-panel")
        .nth(index - 1)
        .locator(".recharts-line-curve"),
    ).toHaveCount(2);
  }
  await page.getByLabel("Временная шкала", { exact: true }).fill("1");
  await expect(page.locator(".chart-time-cursor").first()).toHaveAttribute(
    "data-time",
    "1",
  );
  const grid = page.locator(".recharts-cartesian-grid").first();
  await grid.scrollIntoViewIfNeeded();
  const rect = (await grid.boundingBox())!;
  await page.mouse.click(rect.x + rect.width * 0.3, rect.y + rect.height * 0.5);
  await expect(page.getByTestId("hud-time")).not.toHaveText("1,00");
  await expect(page.locator(".plot-tooltip").first()).toContainText("Запуск 1");
  const downloaded = page.waitForEvent("download");
  await page.getByTitle("Экспорт графика SVG").first().click();
  expect((await downloaded).suggestedFilename()).toBe(
    "physicslab-thetaX-t.svg",
  );

  // A body held at rest has undefined angles for the whole interval.
  await page.getByRole("tab", { name: "Редактор модели" }).click();
  await page
    .getByLabel("Начальная скорость: точное значение", { exact: true })
    .fill("0");
  await page
    .getByLabel("Начальная высота: точное значение", { exact: true })
    .fill("10");
  await page.getByLabel("Формула Fx").fill("0");
  await page.getByLabel("Формула Fy").fill("0");
  await page.getByRole("button", { name: "Применить модель" }).click();
  await page.getByRole("tab", { name: "Анализ", exact: true }).click();
  // Analysis remounts after leaving the editor; select the angle axes again.
  await page.getByLabel("График 1: ось Y").selectOption("thetaX");
  await page.getByLabel("График 2: ось Y").selectOption("thetaY");
  for (const chart of await page.locator(".chart-panel").all()) {
    // Only the saved nonzero run contributes a curve.
    await expect(chart.locator(".recharts-line-curve[d]")).toHaveCount(1);
    expect(
      await chart.locator(".recharts-surface").getAttribute("viewBox"),
    ).not.toMatch(/NaN|Infinity/);
  }
  await expect(page.getByTestId("hud-angle-Ox")).toHaveText("—");
  await page.getByRole("button", { name: "Очистить", exact: true }).click();
  await expect(page.locator(".recharts-line-curve[d]")).toHaveCount(0);
  await page.getByLabel("График 1: ось Y").selectOption("energy");
  await expect(page.getByLabel("График 1: ось X")).toBeEnabled();
  await page.getByLabel("График 1: ось X").selectOption("x");
  await expect(page.locator(".recharts-line-curve").first()).toHaveAttribute(
    "d",
    /^M/,
  );
  await page.getByLabel("График 1: ось X").selectOption("t");
  await expect(page.locator(".recharts-line-curve").first()).toHaveAttribute(
    "d",
    /^M/,
  );

  // On release from rest the first sample is absent, rather than plotted at 0°.
  await page.getByRole("tab", { name: "Редактор модели" }).click();
  await page.getByLabel("Формула Fy").fill("-m*g");
  await page.getByRole("button", { name: "Применить модель" }).click();
  await page.getByRole("tab", { name: "Анализ", exact: true }).click();
  await page.getByLabel("График 1: ось Y").selectOption("thetaY");
  const curve = page.locator(".recharts-line-curve[d]").first();
  await expect(curve).toHaveAttribute("d", /^M/);
  const firstX = Number(
    (await curve.getAttribute("d"))!.match(/^M([\d.]+)/)![1],
  );
  const gridX = await page
    .locator(".recharts-cartesian-grid")
    .first()
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left - element.closest("svg")!.getBoundingClientRect().left;
    });
  expect(firstX).toBeGreaterThan(gridX + 0.1);
});

test("формулы и свечение: обе темы, мобильный и широкий экран", async ({
  page,
}) => {
  for (const width of [375, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(lab);
    await page.getByRole("tab", { name: "Анализ", exact: true }).click();
    await page.getByRole("button", { name: "Формулы и метод" }).click();
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
      await page
        .locator(".formulas")
        .screenshot({ path: `test-results/formulas-${width}-${theme}.png` });
      await page.getByLabel("Временная шкала", { exact: true }).fill("1.5");
      await surfaceOf(page).scrollIntoViewIfNeeded();
      await surfaceOf(page).screenshot({
        path: `test-results/glow-${width}-${theme}.png`,
      });
    }
  }
});

test("формулы: разделы, отдельные энергии и описание активной модели", async ({
  page,
}) => {
  await page.goto(lab);
  await page.getByRole("tab", { name: "Анализ", exact: true }).click();
  await page.getByRole("button", { name: "Формулы и метод" }).click();
  for (const title of [
    "Координаты и перемещение",
    "Скорость и её проекции",
    "Характеристики траектории",
    "Энергия",
    "Физическая модель и метод вычисления",
  ])
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  await expect(page.locator(".formulas")).toContainText("При v₀ᵧ ≤ 0");
  await expect(page.locator(".formulas")).toContainText("только при v₀ₓ ≠ 0");
  await expect(
    page.locator(".formula").filter({ hasText: "Eк = mv²/2" }),
  ).toHaveCount(1);
  await expect(
    page.locator(".formula").filter({ hasText: "Eп = mgy" }),
  ).toHaveCount(1);
  await page.getByLabel("Сопротивление воздуха", { exact: true }).check();
  await expect(page.locator(".formula-active-note")).toContainText(
    "модель линейного сопротивления",
  );
  await expect(page.locator(".formula-method")).toContainText(
    "Fₓ = −k(vₓ − uₓ)",
  );
  await page.getByRole("tab", { name: "Редактор модели" }).click();
  await page.getByLabel("Формула Fx").fill("m * 2");
  await page.getByLabel("Формула Fy").fill("-m*g");
  await page.getByRole("button", { name: "Применить модель" }).click();
  await page.getByRole("tab", { name: "Анализ", exact: true }).click();
  await page.getByRole("button", { name: "Формулы и метод" }).click();
  await expect(page.locator(".formula-active-note")).toContainText(
    "пользовательская модель",
  );
  await expect(page.locator(".formula-method")).toContainText("RK4");
  await expect(page.locator(".formula-method")).toContainText("Fₓ = m * 2");
});

test.describe("настоящие мобильные касания", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  async function touch(
    cdp: CDPSession,
    type: "touchStart" | "touchMove" | "touchEnd" | "touchCancel",
    points: { id: number; x: number; y: number }[],
  ) {
    await cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
  }
  for (const analysis of [false, true])
    test(`pinch, движущийся центр, продолжение одним пальцем: ${analysis ? "анализ" : "эксперимент"}`, async ({
      page,
    }) => {
      await page.goto(lab);
      if (analysis)
        await page.getByRole("tab", { name: "Анализ", exact: true }).click();
      const surface = surfaceOf(page);
      await surface.scrollIntoViewIfNeeded();
      const box = (await surface.boundingBox())!;
      const cx = box.x + box.width * 0.55,
        cy = box.y + box.height * 0.45;
      const start = await camera(surface),
        scroll = await page.evaluate(() => scrollY);
      const world = {
        x: start.x + (cx - box.x - start.w / 2) / start.scale,
        y: start.y - (cy - box.y - start.h / 2) / start.scale,
      };
      const cdp = await page.context().newCDPSession(page);
      await touch(cdp, "touchStart", [
        { id: 1, x: cx - 35, y: cy },
        { id: 2, x: cx + 35, y: cy },
      ]);
      for (let i = 1; i <= 5; i++)
        await touch(cdp, "touchMove", [
          { id: 1, x: cx - 35 - i * 6 + i * 2, y: cy + i * 3 },
          { id: 2, x: cx + 35 + i * 6 + i * 2, y: cy + i * 3 },
        ]);
      await expect
        .poll(async () => (await camera(surface)).scale)
        .toBeGreaterThan(start.scale * 1.8);
      const zoomed = await camera(surface);
      expect(start.w / 2 + (world.x - zoomed.x) * zoomed.scale).toBeCloseTo(
        cx - box.x + 10,
        2,
      );
      expect(start.h / 2 - (world.y - zoomed.y) * zoomed.scale).toBeCloseTo(
        cy - box.y + 15,
        2,
      );
      expect(await page.evaluate(() => scrollY)).toBe(scroll);
      // Release one pointer at the current location, then pan with the other.
      await touch(cdp, "touchEnd", [{ id: 2, x: cx + 75, y: cy + 15 }]);
      const afterRelease = await camera(surface);
      expect(afterRelease).toEqual(zoomed);
      await touch(cdp, "touchMove", [{ id: 1, x: cx - 40, y: cy + 25 }]);
      await expect
        .poll(async () => (await camera(surface)).x)
        .not.toBe(zoomed.x);
      const panned = await camera(surface);
      expect(panned.x).toBeCloseTo(zoomed.x - 15 / zoomed.scale, 5);
      expect(panned.y).toBeCloseTo(zoomed.y + 10 / zoomed.scale, 5);
      await touch(cdp, "touchEnd", []);
      expect(await camera(surface)).toEqual(panned);
      await touch(cdp, "touchStart", [
        { id: 1, x: cx - 65, y: cy },
        { id: 2, x: cx + 65, y: cy },
      ]);
      await touch(cdp, "touchMove", [
        { id: 1, x: cx - 35, y: cy },
        { id: 2, x: cx + 35, y: cy },
      ]);
      await expect
        .poll(async () => (await camera(surface)).scale)
        .toBeLessThan(panned.scale * 0.6);
      await touch(cdp, "touchCancel", []);
      await page.getByTitle("Вписать траекторию", { exact: true }).click();
      await expect
        .poll(async () => (await camera(surface)).scale)
        .toBeCloseTo(start.scale, 5);
    });

  for (const handle of ["launch", "velocity"])
    test(`второй палец прерывает перетаскивание ${handle} без изменения параметров`, async ({
      page,
    }) => {
      await page.goto(lab);
      const surface = surfaceOf(page);
      await surface.scrollIntoViewIfNeeded();
      const box = (await surface.boundingBox())!;
      const target =
        handle === "launch"
          ? page.locator(".body")
          : page.locator('[data-drag="velocity"]');
      const b = (await target.boundingBox())!;
      const point = { id: 1, x: b.x + b.width / 2, y: b.y + b.height / 2 };
      const cdp = await page.context().newCDPSession(page);
      const before = await camera(surface);
      await touch(cdp, "touchStart", [point]);
      const second = {
        id: 2,
        x: box.x + box.width * 0.65,
        y: box.y + box.height * 0.3,
      };
      await touch(cdp, "touchStart", [point, second]);
      await touch(cdp, "touchMove", [
        { ...point, x: point.x + 20 },
        { ...second, x: second.x - 20 },
      ]);
      await expect
        .poll(async () => (await camera(surface)).scale)
        .toBeLessThan(before.scale);
      await touch(cdp, "touchEnd", [{ ...second, x: second.x - 20 }]);
      await touch(cdp, "touchMove", [{ ...point, x: point.x + 30 }]);
      await touch(cdp, "touchEnd", []);
      await page.getByTitle("Показать параметры", { exact: true }).click();
      await expect(
        page.getByLabel("Начальная скорость: точное значение", { exact: true }),
      ).toHaveValue("25");
      await expect(
        page.getByLabel("Начальная высота: точное значение", { exact: true }),
      ).toHaveValue("0");
      await expect(
        page.getByLabel("Угол броска: точное значение", { exact: true }),
      ).toHaveValue("45");
    });
});
