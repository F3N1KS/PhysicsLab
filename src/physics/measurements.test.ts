import { describe, expect, it } from "vitest";
import { velocityAngles } from "./measurements";

describe("Углы скорости с положительными осями", () => {
  it.each([
    [1, 0, 0, 90],
    [-1, 0, 180, 90],
    [0, 1, 90, 0],
    [0, -1, 90, 180],
    [1, 1, 45, 45],
    [-1, -1, 135, 135],
  ])("vx=%s, vy=%s → %s°, %s°", (vx, vy, x, y) => {
    const angles = velocityAngles(vx, vy);
    expect(angles.thetaX).toBeCloseTo(x, 10);
    expect(angles.thetaY).toBeCloseTo(y, 10);
  });
  it("не приписывает направление нулевому вектору", () => {
    expect(velocityAngles(0, -0)).toEqual({ thetaX: null, thetaY: null });
  });
  it("сохраняет конечные углы в [0, 180] для малых и больших компонент", () => {
    for (const speed of [1e-200, 1e-15, 1, 1e14, 1e200])
      for (let i = -180; i <= 180; i++) {
        const rad = (i * Math.PI) / 180;
        const angles = velocityAngles(
          speed * Math.cos(rad),
          speed * Math.sin(rad),
        );
        for (const value of Object.values(angles)) {
          expect(value).not.toBeNull();
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(180);
        }
      }
  });
});
