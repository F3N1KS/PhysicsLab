import type { Parameters } from "./types";
export type ParameterKey = Exclude<keyof Parameters, "drag">;
export const LIMITS: Record<ParameterKey, { min: number; max: number }> = {
  speed: { min: 0, max: 10000 },
  angle: { min: -90, max: 180 },
  height: { min: 0, max: 1e6 },
  x0: { min: -1e6, max: 1e6 },
  mass: { min: 0.001, max: 1e6 },
  g: { min: 0.0001, max: 200 },
  k: { min: 0, max: 1e5 },
  windX: { min: -5000, max: 5000 },
  windY: { min: -5000, max: 5000 },
};
export const clampParameter = (key: ParameterKey, value: number) =>
  Math.max(LIMITS[key].min, Math.min(LIMITS[key].max, value));
export const STANDARD_HORIZON = 1e6;
