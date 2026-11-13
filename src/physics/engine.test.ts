import { describe, expect, it } from "vitest";
import { calculate } from "./engine";
import { DEFAULTS, DEFAULT_MODEL } from "./types";
import { compile } from "./expression";
describe("Аналитическая механика", () => {
  it("правильно считает бросок под углом, время, высоту и дальность", () => {
    const f = calculate(DEFAULTS);
    expect(f.duration).toBeCloseTo((2 * 25 * Math.sin(Math.PI / 4)) / 9.81, 9);
    expect(f.range).toBeCloseTo(625 / 9.81, 8);
    expect(f.maxHeight).toBeCloseTo(625 / (4 * 9.81), 8);
    expect(f.at(f.duration).y).toBeCloseTo(0, 9);
  });
  it("масса не меняет идеальную траекторию", () => {
    const a = calculate(DEFAULTS),
      b = calculate({ ...DEFAULTS, mass: 80 });
    expect(a.duration).toEqual(b.duration);
    expect(a.samples.map((s) => [s.x, s.y])).toEqual(
      b.samples.map((s) => [s.x, s.y]),
    );
  });
  it("сохраняет энергию без сопротивления", () => {
    const f = calculate({ ...DEFAULTS, height: 10 });
    for (const s of f.samples)
      expect(s.energy).toBeCloseTo(f.samples[0].energy, 7);
  });
  it("считает горизонтальный бросок с высоты", () => {
    const f = calculate({ ...DEFAULTS, angle: 0, height: 20 });
    expect(f.duration).toBeCloseTo(Math.sqrt(40 / 9.81), 9);
    expect(f.range).toBeCloseTo(25 * f.duration, 9);
  });
  it("считает вертикальный бросок и отрицательную горизонтальную скорость", () => {
    expect(calculate({ ...DEFAULTS, angle: 90 }).range).toBeCloseTo(0, 9);
    expect(calculate({ ...DEFAULTS, angle: 135 }).range).toBeLessThan(0);
  });
  it("обрабатывает нулевую скорость и бросок с поверхности вниз", () => {
    for (const patch of [{ speed: 0 }, { angle: 0 }, { angle: -45 }]) {
      const f = calculate({ ...DEFAULTS, ...patch });
      expect(f.duration).toBe(0);
      expect(f.landed).toBe(true);
      expect(f.at(100).y).toBe(0);
    }
  });
  it("ограничивает время запроса временем полёта", () => {
    const f = calculate(DEFAULTS);
    expect(f.at(-1).t).toBe(0);
    expect(f.at(1000).t).toBe(f.duration);
  });
});
describe("Линейное сопротивление", () => {
  it("нулевое и очень малое сопротивление сходятся к идеальному", () => {
    const a = calculate(DEFAULTS);
    for (const k of [0, 1e-12, 1e-7]) {
      const b = calculate({ ...DEFAULTS, drag: true, k });
      expect(b.range).toBeCloseTo(a.range, 3);
      expect(b.maxHeight).toBeCloseTo(a.maxHeight, 3);
    }
  });
  it("точно воспроизводит аналитические скорость и координату с ветром", () => {
    const p = { ...DEFAULTS, drag: true, k: 0.4, mass: 2, windX: 4, windY: 1 },
      f = calculate(p),
      t = 1,
      b = 0.2,
      v0 = 25 / Math.sqrt(2),
      terminal = 1 - 9.81 / b;
    const s = f.at(t);
    expect(s.vx).toBeCloseTo(4 + (v0 - 4) * Math.exp(-b * t), 9);
    expect(s.vy).toBeCloseTo(terminal + (v0 - terminal) * Math.exp(-b * t), 9);
    expect(s.x).toBeCloseTo(4 * t + ((v0 - 4) * (1 - Math.exp(-b * t))) / b, 9);
  });
  it("уменьшает дальность и энергию в неподвижном воздухе", () => {
    const a = calculate(DEFAULTS),
      b = calculate({ ...DEFAULTS, drag: true, k: 0.5 });
    expect(b.range).toBeLessThan(a.range);
    expect(b.at(b.duration).energy).toBeLessThan(b.at(0).energy);
  });
  it("сообщает о неприземляющемся теле и ограничивает горизонт", () => {
    const f = calculate({ ...DEFAULTS, drag: true, k: 2, windY: 20 });
    expect(f.landed).toBe(false);
    expect(f.duration).toBe(300);
  });
});
describe("Пользовательская модель RK4", () => {
  it("совпадает с аналитическим решением гравитации", () => {
    const a = calculate(DEFAULTS),
      b = calculate(DEFAULTS, { ...DEFAULT_MODEL, fx: "0", fy: "-m*g" });
    expect(b.duration).toBeCloseTo(a.duration, 7);
    expect(b.range).toBeCloseTo(a.range, 7);
    expect(b.at(1.234).y).toBeCloseTo(a.at(1.234).y, 7);
  });
  it("совпадает с аналитическим решением сопротивления", () => {
    const p = { ...DEFAULTS, drag: true },
      a = calculate(p),
      b = calculate(p, DEFAULT_MODEL);
    expect(b.range).toBeCloseTo(a.range, 5);
    expect(b.duration).toBeCloseTo(a.duration, 5);
  });
  it("применяет пользовательские силы и константы", () => {
    const f = calculate(DEFAULTS, {
      ...DEFAULT_MODEL,
      fx: "m*c",
      fy: "-m*g",
      constants: { c: 2 },
    });
    expect(f.at(1).vx).toBeCloseTo(25 / Math.sqrt(2) + 2, 7);
  });
  it("ограничивает число шагов, неверные параметры и константы", () => {
    expect(() =>
      calculate(DEFAULTS, { ...DEFAULT_MODEL, duration: 120, dt: 0.001 }),
    ).toThrow();
    expect(() => calculate({ ...DEFAULTS, mass: 0 })).toThrow();
    expect(() =>
      calculate(DEFAULTS, { ...DEFAULT_MODEL, constants: { m: 2 } }),
    ).toThrow();
  });
  it("прерывает неустойчивые и неопределённые модели", () => {
    expect(() =>
      calculate(DEFAULTS, { ...DEFAULT_MODEL, fx: "1/0" }),
    ).toThrow();
    expect(() =>
      calculate(DEFAULTS, { ...DEFAULT_MODEL, fy: "exp(1000)" }),
    ).toThrow();
  });
});
describe("Безопасный парсер", () => {
  it("учитывает приоритет и правую ассоциативность степени", () => {
    expect(compile("-2^2 + 2^3^2", [])({})).toBe(508);
    expect(compile("sin(pi/2) + sqrt(a)", ["a"])({ a: 9 })).toBeCloseTo(4);
  });
  it("отклоняет JavaScript, неизвестные имена, ошибки синтаксиса", () => {
    for (const s of [
      "window.alert(1)",
      "constructor",
      "1;2",
      "x = 1",
      "sin(",
      "2 +",
      "1 2",
      "Math.sin(0)",
      "2 ** 3",
      "",
    ])
      expect(() => compile(s, ["x"])).toThrow();
  });
  it("отклоняет недопустимые численные значения", () => {
    expect(() => compile("sqrt(-1)", [])({})).toThrow();
    expect(() => compile("1/0", [])({})).toThrow();
    expect(() => compile("1+".repeat(200), [])).toThrow();
  });
});
