import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  headless: true,
  args: ["--no-sandbox"],
});
const results = [];
for (const config of [
  { charts: 0, runs: 0 },
  { charts: 2, runs: 0 },
  { charts: 4, runs: 0 },
  { charts: 4, runs: 3 },
  { charts: 4, runs: 6 },
  { charts: 0, runs: 0, table: true },
]) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await page.goto(
    `${process.env.BENCHMARK_URL || "http://127.0.0.1:5173"}/mechanics/projectile`,
  );
  await page
    .getByLabel("Начальная скорость: точное значение", { exact: true })
    .fill("100");
  if (config.charts || config.table) {
    await page.getByRole("tab", { name: "Анализ", exact: true }).click();
    await page.locator(".recharts-line-curve").first().waitFor();
    for (let i = 0; i < config.runs; i++)
      await page
        .getByRole("button", { name: "К сравнению", exact: true })
        .click();
    for (let n = 2; n < config.charts; n++)
      await page.getByRole("button", { name: `График ${n}/4` }).click();
    if (config.table) {
      await page.getByRole("button", { name: "Таблица", exact: true }).click();
      await page.getByLabel("Шаг таблицы", { exact: true }).fill("0.01");
    }
  }
  await page.waitForTimeout(350);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  await page.evaluate(() => {
    window.__renders = [];
    window.__parts = {};
    window.__pathChanges = 0;
    window.__sceneChanges = 0;
    window.__frames = [];
    window.__longTasks = [];
    new MutationObserver((records) => {
      for (const r of records) {
        if (r.target.matches?.(".recharts-line-curve")) window.__pathChanges++;
        if (r.target.matches?.(".predicted")) window.__sceneChanges++;
      }
    }).observe(document.body, {
      attributes: true,
      subtree: true,
      attributeFilter: ["d"],
    });
    new PerformanceObserver((list) =>
      window.__longTasks.push(...list.getEntries().map((e) => e.duration)),
    ).observe({ type: "longtask" });
    let last = performance.now();
    window.__measuring = true;
    const tick = (now) => {
      window.__frames.push(now - last);
      last = now;
      if (window.__measuring) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const before = (await cdp.send("Performance.getMetrics")).metrics;
  await page.getByRole("button", { name: "Запуск", exact: true }).click();
  await page.waitForTimeout(3000);
  const after = (await cdp.send("Performance.getMetrics")).metrics;
  const summary = await page.evaluate(() => {
    window.__measuring = false;
    const stats = (a) => {
      a.sort((a, b) => a - b);
      return {
        n: a.length,
        mean: a.reduce((s, v) => s + v, 0) / Math.max(a.length, 1),
        p95: a[Math.floor(a.length * 0.95)] ?? 0,
        max: a.at(-1) ?? 0,
      };
    };
    return {
      render: window.__renders.length ? stats(window.__renders) : undefined,
      parts: Object.fromEntries(
        Object.entries(window.__parts).map(([k, v]) => [k, stats(v)]),
      ),
      frame: stats(window.__frames),
      longTasks: stats(window.__longTasks),
      curveMutations: window.__pathChanges,
      sceneMutations: window.__sceneChanges,
      time: document.querySelector('[data-testid="hud-time"]').textContent,
    };
  });
  const delta = (name) =>
    after.find((x) => x.name === name).value -
    before.find((x) => x.name === name).value;
  const result = {
    ...config,
    ...summary,
    taskMs: delta("TaskDuration") * 1000,
    scriptMs: delta("ScriptDuration") * 1000,
  };
  results.push(result);
  console.log(JSON.stringify(result));
  await page.close();
}
await browser.close();
if (process.argv[2])
  writeFileSync(process.argv[2], JSON.stringify(results, null, 2));
