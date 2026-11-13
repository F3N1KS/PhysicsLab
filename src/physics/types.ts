export interface Parameters {
  speed: number;
  angle: number;
  height: number;
  x0: number;
  mass: number;
  g: number;
  k: number;
  windX: number;
  windY: number;
  drag: boolean;
}
export interface State {
  t: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  speed: number;
  ek: number;
  ep: number;
  energy: number;
}
export interface Model {
  fx: string;
  fy: string;
  constants: Record<string, number>;
  dt: number;
  duration: number;
}
export interface Flight {
  samples: State[];
  duration: number;
  range: number;
  maxHeight: number;
  landed: boolean;
  at: (t: number) => State;
  method: string;
}
export interface Run {
  id: number;
  name: string;
  color: string;
  flight: Flight;
  params: Parameters;
}
export const DEFAULTS: Parameters = {
  speed: 25,
  angle: 45,
  height: 0,
  x0: 0,
  mass: 1,
  g: 9.81,
  k: 0.1,
  windX: 0,
  windY: 0,
  drag: false,
};
export const DEFAULT_MODEL: Model = {
  fx: "-k * vx",
  fy: "-m * g - k * vy",
  constants: {},
  dt: 0.01,
  duration: 30,
};
export const LABELS: Record<keyof State, string> = {
  t: "Время, с",
  x: "Координата X, м",
  y: "Высота Y, м",
  vx: "Скорость X, м/с",
  vy: "Скорость Y, м/с",
  ax: "Ускорение X, м/с²",
  ay: "Ускорение Y, м/с²",
  speed: "Скорость, м/с",
  ek: "Кинетическая энергия, Дж",
  ep: "Потенциальная энергия, Дж",
  energy: "Механическая энергия, Дж",
};
export const fmt = (v: number, digits = 2) =>
  Number.isFinite(v)
    ? (Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v).toLocaleString("ru-RU", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      })
    : "—";
