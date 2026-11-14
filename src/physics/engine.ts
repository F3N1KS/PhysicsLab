import type { Flight, Model, Parameters, State } from "./types";
import { LIMITS, STANDARD_HORIZON } from "./limits";
import type { ParameterKey } from "./limits";
import { compile } from "./expression";
type Vector = [number, number, number, number];
export function rk4(
  t: number,
  s: Vector,
  dt: number,
  derivative: (t: number, s: Vector) => Vector,
): Vector {
  const add = (a: Vector, b: Vector, scale: number) =>
    a.map((v, i) => v + b[i] * scale) as Vector;
  const a = derivative(t, s),
    b = derivative(t + dt / 2, add(s, a, dt / 2)),
    c = derivative(t + dt / 2, add(s, b, dt / 2)),
    d = derivative(t + dt, add(s, c, dt));
  return s.map(
    (v, i) => v + (dt / 6) * (a[i] + 2 * b[i] + 2 * c[i] + d[i]),
  ) as Vector;
}
function state(
  p: Parameters,
  t: number,
  v: Vector,
  ax: number,
  ay: number,
): State {
  if (
    ![...v, ax, ay].every(Number.isFinite) ||
    v.some((n) => Math.abs(n) > 1e14)
  )
    throw new Error("Модель неустойчива: уменьшите шаг или величины сил.");
  const [x, y, vx, vy] = v,
    speed = Math.hypot(vx, vy),
    ek = (p.mass * speed ** 2) / 2,
    ep = p.mass * p.g * Math.max(0, y);
  return {
    t,
    x,
    y: Math.max(0, y),
    vx,
    vy,
    ax,
    ay,
    speed,
    ek,
    ep,
    energy: ek + ep,
  };
}
export function calculate(p: Parameters, model?: Model): Flight {
  for (const key of Object.keys(LIMITS) as ParameterKey[]) {
    const value = p[key],
      { min, max } = LIMITS[key];
    if (!Number.isFinite(value) || value < min || value > max)
      throw new Error(`Параметр ${key}: допустимый диапазон ${min}…${max}.`);
  }
  const rad = (p.angle * Math.PI) / 180,
    vx = p.speed * Math.cos(rad),
    vy = p.speed * Math.sin(rad);
  const b = p.drag ? p.k / p.mass : 0;
  const raw = (t: number): State => {
    // Stable evaluation even for tiny damping: avoid subtraction of large terminal velocities.
    const z = b * t,
      q = b ? -Math.expm1(-z) / b : t;
    const r =
      Math.abs(z) < 1e-3
        ? t * t * (0.5 - z / 6 + (z * z) / 24 - z ** 3 / 120)
        : (t - q) / b;
    const ax0 = -b * (vx - p.windX),
      ay0 = -p.g - b * (vy - p.windY);
    const exp = Math.exp(-z);
    // At strong damping use terminal velocity directly to avoid cancellation.
    const terminalX = p.windX,
      terminalY = p.windY - p.g / b;
    const strong = z >= 1e-3;
    const vxt = strong ? terminalX + (vx - terminalX) * exp : vx + ax0 * q;
    const vyt = strong ? terminalY + (vy - terminalY) * exp : vy + ay0 * q;
    return {
      ...state(
        p,
        t,
        [
          strong
            ? p.x0 + terminalX * t + (vx - terminalX) * q
            : p.x0 + vx * t + ax0 * r,
          strong
            ? p.height + terminalY * t + (vy - terminalY) * q
            : p.height + vy * t + ay0 * r,
          vxt,
          vyt,
        ],
        ax0 * exp,
        ay0 * exp,
      ),
      y: strong
        ? p.height + terminalY * t + (vy - terminalY) * q
        : p.height + vy * t + ay0 * r,
    };
  };
  let at: (t: number) => State = raw,
    duration = 0,
    landed = false;
  if (model) {
    if (
      !(
        model.dt >= 0.001 &&
        model.dt <= 0.1 &&
        model.duration > 0 &&
        model.duration <= 120
      ) ||
      Math.ceil(model.duration / model.dt) > 20000
    )
      throw new Error(
        "Шаг 0,001–0,1 с; горизонт до 120 с; не более 20 000 шагов.",
      );
    const reserved = [
      "t",
      "x",
      "y",
      "vx",
      "vy",
      "m",
      "g",
      "k",
      "ux",
      "uy",
      "pi",
      "e",
      "sin",
      "cos",
      "tan",
      "abs",
      "sqrt",
      "exp",
      "log",
    ];
    if (
      Object.keys(model.constants).some(
        (n) => !/^[A-Za-z_][A-Za-z_0-9]*$/.test(n) || reserved.includes(n),
      ) ||
      !Object.values(model.constants).every(Number.isFinite)
    )
      throw new Error(
        "Константам нужны уникальные латинские имена и конечные значения.",
      );
    const names = [...reserved, ...Object.keys(model.constants)],
      fx = compile(model.fx, names),
      fy = compile(model.fy, names);
    const derivative = (t: number, s: Vector): Vector => {
      if (!s.every(Number.isFinite) || s.some((v) => Math.abs(v) > 1e8))
        throw new Error("Модель неустойчива: уменьшите шаг или величины сил.");
      const [x, y, vxx, vyy] = s,
        vars = {
          ...model.constants,
          t,
          x,
          y,
          vx: vxx,
          vy: vyy,
          m: p.mass,
          g: p.g,
          k: p.k,
          ux: p.windX,
          uy: p.windY,
        };
      return [vxx, vyy, fx(vars) / p.mass, fy(vars) / p.mass];
    };
    const make = (t: number, v: Vector) => {
      const d = derivative(t, v);
      return state(p, t, v, d[2], d[3]);
    };
    let v: Vector = [p.x0, p.height, vx, vy];
    const nodes: State[] = [make(0, v)];
    if (
      p.height === 0 &&
      (vy < -1e-10 || (Math.abs(vy) < 1e-10 && nodes[0].ay <= 0))
    )
      landed = true;
    while (!landed && duration < model.duration - 1e-10) {
      const dt = Math.min(model.dt, model.duration - duration),
        next = rk4(duration, v, dt, derivative);
      if (next[1] <= 0) {
        let lo = 0,
          hi = dt;
        for (let j = 0; j < 35; j++) {
          const mid = (lo + hi) / 2;
          if (rk4(duration, v, mid, derivative)[1] > 0) lo = mid;
          else hi = mid;
        }
        v = rk4(duration, v, (lo + hi) / 2, derivative);
        v[1] = 0;
        duration += (lo + hi) / 2;
        landed = true;
      } else {
        v = next;
        duration += dt;
      }
      nodes.push(make(duration, v));
    }
    at = (t: number) => {
      t = Math.max(0, Math.min(duration, t));
      let lo = 0,
        hi = nodes.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (nodes[mid].t <= t) lo = mid;
        else hi = mid;
      }
      const a = nodes[lo];
      if (t === a.t || lo === hi) return a;
      return make(t, rk4(a.t, [a.x, a.y, a.vx, a.vy], t - a.t, derivative));
    };
  } else {
    if (p.height === 0 && vy <= 1e-10) {
      landed = true;
      duration = 0;
    } else {
      let hi = 0.01;
      while (hi < STANDARD_HORIZON && raw(hi).y > 0)
        hi = Math.min(STANDARD_HORIZON, hi * 2);
      if (raw(hi).y <= 0) {
        let lo = 0;
        for (let j = 0; j < 60; j++) {
          const mid = (lo + hi) / 2;
          if (raw(mid).y > 0) lo = mid;
          else hi = mid;
        }
        duration = (lo + hi) / 2;
        landed = true;
      } else duration = STANDARD_HORIZON;
    }
  }
  const evaluate = at;
  at = (t) => {
    const s = evaluate(Math.max(0, Math.min(duration, t)));
    return { ...s, y: Math.max(0, s.y) };
  };
  const samples = Array.from({ length: duration ? 601 : 1 }, (_, i) =>
    at((duration * i) / (duration ? 600 : 1)),
  );
  let maxHeight = Math.max(...samples.map((s) => s.y));
  if (!model && vy > 0) {
    const apex =
      b > 0 ? Math.log1p((b * vy) / (p.g - b * p.windY)) / b : vy / p.g;
    if (Number.isFinite(apex) && apex >= 0 && apex <= duration)
      maxHeight = Math.max(maxHeight, at(apex).y);
  }
  return {
    samples,
    duration,
    landed,
    range: at(duration).x - p.x0,
    maxHeight,
    at,
    method: model
      ? "RK4 · адаптация последнего шага"
      : b
        ? "Точное решение · линейное сопротивление"
        : "Аналитическое решение · идеальная модель",
  };
}
