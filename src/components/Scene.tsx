import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, Minus, Plus, Move, RotateCcw } from "lucide-react";
import type { Flight, Parameters, State } from "../physics/types";
import { fmt } from "../physics/types";
import { clampParameter } from "../physics/limits";
import {
  fitCamera,
  pinchCamera,
  screen,
  world as toWorld,
  zoomAt,
} from "../utils/camera";
import type { Camera, Point } from "../utils/camera";
import { formatTick, niceStep, ticks } from "../utils/ticks";
import { projectedLine, trajectory } from "../utils/trajectory";
export interface Layers {
  trajectory: boolean;
  velocity: boolean;
  acceleration: boolean;
  gravity: boolean;
  resistance: boolean;
  projections: boolean;
  coordinates: boolean;
  points: boolean;
  ghosts: boolean;
}
export const INITIAL_LAYERS: Layers = {
  trajectory: true,
  velocity: true,
  acceleration: false,
  gravity: false,
  resistance: false,
  projections: false,
  coordinates: true,
  points: true,
  ghosts: false,
};
interface Props {
  flight: Flight;
  params: Parameters;
  current: State;
  layers: Layers;
  onParams?: (p: Partial<Parameters>) => void;
  custom?: boolean;
}
export default function Scene({
  flight,
  params,
  current,
  layers,
  onParams,
  custom,
}: Props) {
  const ref = useRef<HTMLDivElement>(null),
    [size, setSize] = useState({ w: 1000, h: 600 });
  const svgRef = useRef<SVGSVGElement>(null);
  const [camera, setCamera] = useState<Camera>(),
    [info, setInfo] = useState(false);
  const drag = useRef<{
    mode: string;
    x: number;
    y: number;
    multiplier: number;
  } | null>(null);
  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<{
    camera: Camera;
    points: [Point, Point];
  } | null>(null);
  const suppressClick = useRef(false);
  useEffect(() => {
    const observer = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const { w, h } = size;
  const bounds = useMemo(
    () => ({
      min: Math.min(params.x0, ...flight.samples.map((s) => s.x)),
      max: Math.max(params.x0 + 10, ...flight.samples.map((s) => s.x)),
    }),
    [flight, params.x0],
  );
  const minX = bounds.min;
  const view = useMemo(
    () => camera ?? fitCamera(size, bounds.min, bounds.max, flight.maxHeight),
    [camera, size, bounds, flight],
  );
  const scale = view.scale;
  const liveCamera = useRef(view);
  liveCamera.current = view;
  const moveCamera = (next: Camera) => {
    liveCamera.current = next;
    setCamera(next);
  };
  const pointerPoint = (e: React.PointerEvent<SVGSVGElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * w) / rect.width,
      y: ((e.clientY - rect.top) * h) / rect.height,
    };
  };
  const startPinch = () => {
    const [a, b] = pointers.current.values();
    pinch.current =
      a && b ? { camera: liveCamera.current, points: [a, b] } : null;
  };
  const endPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.delete(e.pointerId)) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (pointers.current.size >= 2) startPinch();
    else {
      pinch.current = null;
      const [remaining] = pointers.current.values();
      // Continue with camera panning, never resume an interrupted body/vector drag.
      drag.current = remaining
        ? { mode: "pan", ...remaining, multiplier: vectorSeconds }
        : null;
    }
  };
  const sx = (x: number) => screen(view, size, x, 0).x,
    sy = (y: number) => screen(view, size, 0, y).y;
  const world = (x: number, y: number) => toWorld(view, size, x, y);
  const line = (states: State[]) => projectedLine(states, view, size);
  const geometry = useMemo(
    () => trajectory(flight, view, size),
    [flight, view, size],
  );
  const predicted = useMemo(
    () => projectedLine(geometry, view, size),
    [geometry, view, size],
  );
  const traveled = [...geometry.filter((s) => s.t < current.t), current];
  const sampledMax = useMemo(
    () => Math.max(...flight.samples.map((s) => s.y)),
    [flight],
  );
  const grid = Math.max(
    niceStep(100 / scale),
    Math.max(Math.abs(view.x), Math.abs(view.y))
      ? niceStep(
          Math.max(Math.abs(view.x), Math.abs(view.y)) * Number.EPSILON * 4,
        )
      : 0,
  );
  const xs = ticks(world(0, 0).x, world(w, 0).x, grid),
    ys = ticks(world(0, h).y, world(0, 0).y, grid);
  const rad = (params.angle * Math.PI) / 180;
  // Keep the velocity handle reachable on both astronomical and microscopic views.
  const vectorSeconds =
    Math.max(50, Math.min(140, params.speed * scale * 0.65)) /
    (Math.max(params.speed, 1) * scale);
  const launch = {
    x: sx(params.x0 + params.speed * Math.cos(rad) * vectorSeconds),
    y: sy(params.height + params.speed * Math.sin(rad) * vectorSeconds),
  };
  useEffect(() => {
    const surface = svgRef.current;
    if (!surface) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = surface.getBoundingClientRect();
      const delta =
        e.deltaY *
        (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1);
      setCamera((c) =>
        zoomAt(
          c ?? view,
          size,
          Math.exp(-Math.max(-500, Math.min(500, delta)) * 0.002),
          ((e.clientX - rect.left) * w) / rect.width,
          ((e.clientY - rect.top) * h) / rect.height,
        ),
      );
    };
    surface.addEventListener("wheel", wheel, { passive: false });
    return () => surface.removeEventListener("wheel", wheel);
  }, [view, size, w, h]);
  const arrow = (
    dx: number,
    dy: number,
    color: string,
    label: string,
    multiplier: number,
  ) => {
    const magnitude = Math.hypot(dx, dy) * scale * multiplier;
    multiplier *= Math.min(1, 160 / Math.max(1, magnitude));
    return (
      <g className="vector" key={label} style={{ color }}>
        <line
          x1={sx(current.x)}
          y1={sy(current.y)}
          x2={sx(current.x + dx * multiplier)}
          y2={sy(current.y + dy * multiplier)}
          markerEnd={`url(#arrow-${color.replace("#", "")})`}
        />
        <text
          x={sx(current.x + dx * multiplier) + 9}
          y={sy(current.y + dy * multiplier) - 8}
        >
          {label}
        </text>
      </g>
    );
  };
  const staticScene = useMemo(
    () => (
      <>
        <defs>
          <radialGradient id="ball">
            <stop stopColor="#fff" />
            <stop offset=".45" stopColor="#adf3ff" />
            <stop offset="1" stopColor="#4cc9ed" />
          </radialGradient>
          <filter id="glow" x="-75%" y="-75%" width="250%" height="250%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          {["#5bd8f5", "#b39aff", "#ffbe7c", "#e98caf"].map((c) => (
            <marker
              key={c}
              id={`arrow-${c.slice(1)}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path
                d="M0 1 L9 5 L0 9"
                fill="none"
                stroke={c}
                strokeWidth="1.5"
              />
            </marker>
          ))}
        </defs>
        <g className="scene-grid" data-grid-step={grid}>
          {xs.map((x) => (
            <g key={x} data-axis="x">
              <line x1={sx(x)} x2={sx(x)} y1="0" y2={h} />
              <text
                x={sx(x) + 5}
                y={Math.min(h - 17, Math.max(30, sy(0) + 23))}
              >
                {formatTick(x, grid)}
              </text>
            </g>
          ))}
          {ys.map((y) => (
            <g key={y} data-axis="y">
              <line x1="0" x2={w} y1={sy(y)} y2={sy(y)} />
              <text
                visibility={sy(y) < 80 ? "hidden" : "visible"}
                x={Math.max(12, Math.min(w - 35, sx(minX) - 30))}
                y={sy(y) - 6}
              >
                {formatTick(y, grid)}
              </text>
            </g>
          ))}
        </g>
        <path className="ground" d={`M0 ${sy(0)} H${w}`} />
        <text
          className="axis-label"
          x={w - 45}
          y={Math.min(h - 13, sy(0) + 25)}
        >
          X, м
        </text>
        <text className="axis-label" x="20" y="68">
          Y, м
        </text>
        {layers.trajectory && <path className="predicted" d={predicted} />}
        {layers.ghosts &&
          flight.samples
            .filter((_, i) => i % 40 === 0)
            .map((s, i) => (
              <circle
                key={i}
                cx={sx(s.x)}
                cy={sy(s.y)}
                r="3"
                fill="#59c9ff"
                opacity=".4"
              />
            ))}
        {layers.points && (
          <g className="points">
            <line
              x1={sx(flight.samples[0].x)}
              x2={sx(flight.at(flight.duration).x)}
              y1={sy(0) + 38}
              y2={sy(0) + 38}
            />
            <text
              x={
                (sx(flight.samples[0].x) + sx(flight.at(flight.duration).x)) / 2
              }
              y={sy(0) + 55}
              textAnchor="middle"
            >
              {flight.landed
                ? `L = ${fmt(flight.range)} м`
                : "Горизонт расчёта"}
            </text>
            {flight.samples
              .filter((s, i) => i > 0 && i < 600 && s.y === sampledMax)
              .map((s, i) => (
                <g key={i}>
                  <circle cx={sx(s.x)} cy={sy(s.y)} r="4" />
                  <text x={sx(s.x)} y={sy(s.y) - 17} textAnchor="middle">
                    H = {fmt(flight.maxHeight)} м
                  </text>
                </g>
              ))}
          </g>
        )}
      </>
    ),
    [view, size, flight, layers, predicted, params.x0, minX, sampledMax],
  );
  return (
    <div className="scene" ref={ref} data-testid="scene">
      <div className="scene-heading">
        <span className="live-dot" /> СИМУЛЯЦИЯ 02D{" "}
        <span className="scene-model">
          {custom
            ? "Пользовательская модель"
            : params.drag
              ? "Линейное сопротивление"
              : "Идеальная среда"}
        </span>
      </div>
      <svg
        ref={svgRef}
        data-scale={scale}
        data-camera-x={view.x}
        data-camera-y={view.y}
        data-world-width={w / scale}
        data-time={current.t}
        width="100%"
        height="100%"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label="Интерактивная траектория броска тела"
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          const point = pointerPoint(e);
          pointers.current.set(e.pointerId, point);
          e.currentTarget.setPointerCapture(e.pointerId);
          if (pointers.current.size >= 2) {
            suppressClick.current = true;
            drag.current = null;
            startPinch();
            return;
          }
          suppressClick.current = false;
          const target = e.target as Element;
          moveCamera(liveCamera.current);
          drag.current = {
            mode: target.getAttribute("data-drag") || "pan",
            ...point,
            multiplier: vectorSeconds,
          };
        }}
        onPointerMove={(e) => {
          if (!pointers.current.has(e.pointerId)) return;
          const point = pointerPoint(e);
          pointers.current.set(e.pointerId, point);
          if (pinch.current) {
            const [a, b] = pointers.current.values();
            moveCamera(
              pinchCamera(pinch.current.camera, size, pinch.current.points, [
                a,
                b,
              ]),
            );
            return;
          }
          if (!drag.current) return;
          const p = toWorld(liveCamera.current, size, point.x, point.y);
          if (
            Math.hypot(point.x - drag.current.x, point.y - drag.current.y) > 2
          )
            suppressClick.current = true;
          if (drag.current.mode === "launch")
            onParams?.({
              x0: clampParameter("x0", p.x),
              height: clampParameter("height", p.y),
            });
          else if (drag.current.mode === "velocity") {
            const dx = p.x - params.x0,
              dy = p.y - params.height;
            onParams?.({
              speed: clampParameter(
                "speed",
                Math.hypot(dx, dy) / drag.current.multiplier,
              ),
              angle: Math.max(
                -90,
                Math.min(180, (Math.atan2(dy, dx) * 180) / Math.PI),
              ),
            });
          } else {
            const c = liveCamera.current;
            moveCamera({
              ...c,
              x: c.x - (point.x - drag.current.x) / c.scale,
              y: c.y + (point.y - drag.current.y) / c.scale,
            });
          }
          drag.current.x = point.x;
          drag.current.y = point.y;
        }}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onLostPointerCapture={endPointer}
        onClickCapture={(e) => {
          if (suppressClick.current) e.stopPropagation();
        }}
      >
        {staticScene}
        <path className="trail-glow" d={line(traveled.slice(-60))} />
        <path className="trail" d={line(traveled)} />
        {traveled
          .slice(-35)
          .map((point, i, tail) =>
            i > 0 ? (
              <path
                key={i}
                d={line([tail[i - 1], point])}
                fill="none"
                stroke="var(--cyan)"
                strokeWidth="3"
                strokeLinecap="round"
                opacity={i / tail.length}
              />
            ) : null,
          )}
        {layers.projections && (
          <path
            className="projection"
            d={`M${sx(current.x)} ${sy(0)} V${sy(current.y)} H${sx(params.x0)}`}
          />
        )}
        {current.t === 0 && onParams && (
          <g className="launch-vector">
            <circle cx={launch.x} cy={launch.y} r="12" data-drag="velocity" />
            <circle
              cx={sx(params.x0)}
              cy={sy(params.height)}
              r="16"
              data-drag="launch"
            />
          </g>
        )}
        {layers.velocity &&
          arrow(
            current.vx,
            current.vy,
            "#5bd8f5",
            current.t === 0 ? "v₀" : "v",
            vectorSeconds,
          )}
        {layers.acceleration &&
          arrow(current.ax, current.ay, "#b39aff", "a", 0.65)}
        {layers.gravity &&
          arrow(0, -params.mass * params.g, "#ffbe7c", "mg", 0.4)}
        {layers.resistance &&
          params.drag &&
          arrow(
            -params.k * (current.vx - params.windX),
            -params.k * (current.vy - params.windY),
            "#e98caf",
            "Fс",
            0.4,
          )}
        <circle
          cx={sx(current.x)}
          cy={sy(current.y)}
          r="17"
          fill="#59c9ff"
          opacity=".35"
          filter="url(#glow)"
        />
        <circle
          className="body"
          cx={sx(current.x)}
          cy={sy(current.y)}
          r="7"
          fill="url(#ball)"
          data-drag={current.t === 0 ? "launch" : undefined}
          onClick={() => setInfo((v) => !v)}
        />
        {(layers.coordinates || info) && (
          <g className="body-label">
            <rect
              x={sx(current.x) + 16}
              y={sy(current.y) + 14}
              width="150"
              height={info ? 68 : 30}
              rx="7"
            />
            <text x={sx(current.x) + 27} y={sy(current.y) + 34}>
              {fmt(current.x, 1)}; {fmt(current.y, 1)} м
            </text>
            {info && (
              <text x={sx(current.x) + 27} y={sy(current.y) + 58}>
                v = {fmt(current.speed)} м/с
              </text>
            )}
          </g>
        )}
      </svg>
      <span className="scene-scale">
        100 px = {formatTick(100 / scale, niceStep(0.1 / scale))} м
      </span>
      <div className="scene-footer">
        <span title="Масштабирование сцены двумя пальцами">
          <Move size={13} /> Перетаскивание · камера
        </span>
        <span>
          v × {formatTick(vectorSeconds, niceStep(vectorSeconds / 100))} с ·
          длина векторов адаптируется
        </span>
      </div>
      <div className="camera-controls">
        <button
          title="Уменьшить масштаб"
          onClick={() =>
            setCamera((c) => zoomAt(c ?? view, size, 1 / 1.25, w / 2, h / 2))
          }
        >
          <Minus size={16} />
        </button>
        <button
          title="Вписать траекторию"
          onClick={() => {
            setCamera(undefined);
          }}
        >
          <Crosshair size={16} />
        </button>
        <button
          title="Увеличить масштаб"
          onClick={() =>
            setCamera((c) => zoomAt(c ?? view, size, 1.25, w / 2, h / 2))
          }
        >
          <Plus size={16} />
        </button>
        <button
          title="Сбросить камеру"
          onClick={() => {
            setCamera(undefined);
          }}
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}
