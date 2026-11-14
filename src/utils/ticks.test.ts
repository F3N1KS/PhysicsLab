import { describe, it, expect } from "vitest";
import { formatTick, niceStep, ticks, axisTicks } from "./ticks";
describe("Адаптивные деления", () => {
  for (const [step, expected] of [
    [1, ["0", "1", "2", "3"]],
    [0.5, ["0", "0,5", "1", "1,5"]],
    [0.1, ["0", "0,1", "0,2", "0,3"]],
    [0.025, ["0", "0,025", "0,05", "0,075"]],
  ] as const)
    it(`точные подписи при шаге ${step}`, () =>
      expect([0, 1, 2, 3].map((i) => formatTick(i * step, step))).toEqual(
        expected,
      ));
  it("не отображает отрицательный ноль", () => {
    expect(formatTick(-0, 0.1)).toBe("0");
    expect(formatTick(-1e-18, 0.025)).toBe("0");
  });
  for (const [min, max, step] of [
    [-2, 2, 0.5],
    [-0.1, 0.1, 0.025],
    [-1e-10, 1e-10, 2.5e-11],
    [1e10, 1e10 + 2, 0.025],
    [1e12, 1e12 + 1000, 100],
    [1e14, 1e14 + 1, 0.1],
    [1e15, 1e15 + 10, 1],
  ])
    it(`различает соседние координаты ${min}…${max}`, () => {
      const values = ticks(min, max, step),
        labels = values.map((v) => formatTick(v, step));
      expect(values.length).toBeGreaterThan(2);
      expect(new Set(labels).size).toBe(values.length);
    });
  it("выбирает красивые шаги и ограничивает число линий", () => {
    expect([1, 2, 2.5, 5, 10].map((n) => niceStep(n))).toEqual([
      1, 2, 2.5, 5, 10,
    ]);
    expect(niceStep(0.024)).toBe(0.025);
    expect(ticks(-1e9, 1e9, 0.001).length).toBeLessThanOrEqual(200);
    expect(axisTicks(0, 0).max).toBeGreaterThan(0);
  });
});
