import { describe, it, expect } from "vitest";
import {
  fitCamera,
  world,
  screen,
  zoomAt,
  MIN_SCALE,
  MAX_SCALE,
  clipSegment,
} from "./camera";
import { trajectory, projectedLine } from "./trajectory";
import { calculate } from "../physics/engine";
import { DEFAULTS } from "../physics/types";
const size = { w: 1000, h: 600 };
describe("Камера в мировых координатах", () => {
  it("точно обращает экранное преобразование во всём диапазоне", () => {
    for (const scale of [MIN_SCALE, 0.001, 1, 1000, MAX_SCALE]) {
      const camera = { x: 1e6, y: -1e6, scale };
      const p = world(camera, size, 234, 456),
        s = screen(camera, size, p.x, p.y);
      expect(s.x).toBeCloseTo(234, 2);
      expect(s.y).toBeCloseTo(456, 2);
    }
  });
  it("сохраняет точку под курсором при последовательном приближении и отдалении", () => {
    let camera = { x: 1e6, y: 10, scale: 0.01 };
    const point = world(camera, size, 123, 345);
    for (let i = 0; i < 100; i++) {
      camera = zoomAt(camera, size, 1.2, 123, 345);
      const s = screen(camera, size, point.x, point.y);
      expect(s.x).toBeCloseTo(123, 1);
      expect(s.y).toBeCloseTo(345, 1);
    }
    for (let i = 0; i < 100; i++)
      camera = zoomAt(camera, size, 1 / 1.2, 123, 345);
    expect(camera.scale).toBeCloseTo(0.01, 9);
    expect(camera.x).toBeCloseTo(1e6, 5);
  });
  it("позволяет увидеть первые метры длинного броска", () => {
    const f = calculate({ ...DEFAULTS, speed: 1000 });
    let c = fitCamera(size, 0, f.range, f.maxHeight);
    const launch = screen(c, size, 0, 0);
    while (size.w / c.scale > 3) c = zoomAt(c, size, 2, launch.x, launch.y);
    expect(size.w / c.scale).toBeLessThan(3);
    expect(screen(c, size, 0, 0).x).toBeCloseTo(launch.x, 6);
    const points = trajectory(f, c, size);
    const path = projectedLine(points, c, size);
    expect(path).not.toMatch(/NaN|Infinity/);
    expect(path.length).toBeGreaterThan(10);
    expect(points.length).toBeLessThan(9000);
  });
  it("сохраняет непрерывность штриховой траектории в видимой области", () => {
    const flight = calculate(DEFAULTS),
      camera = fitCamera(size, 0, flight.range, flight.maxHeight);
    const path = projectedLine(
      [flight.at(0), flight.at(0.1), flight.at(0.2)],
      camera,
      size,
    );
    expect(path.match(/M/g)).toHaveLength(1);
    expect(path.match(/L/g)).toHaveLength(2);
  });
  it("ограничивает масштаб и отсекает невидимые отрезки", () => {
    expect(zoomAt({ x: 0, y: 0, scale: 1 }, size, 1e30, 500, 300).scale).toBe(
      MAX_SCALE,
    );
    expect(zoomAt({ x: 0, y: 0, scale: 1 }, size, 1e-30, 500, 300).scale).toBe(
      MIN_SCALE,
    );
    expect(
      clipSegment({ x: 1e12, y: 1e12 }, { x: 1e13, y: 1e13 }, size),
    ).toBeNull();
    const segment = clipSegment({ x: -1e12, y: 50 }, { x: 1e12, y: 50 }, size)!;
    expect(segment[0].x).toBeCloseTo(-40, 2);
    expect(segment[1].x).toBeCloseTo(1040, 2);
  });
});
