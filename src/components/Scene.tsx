import { useEffect, useRef, useState } from "react";
import { Crosshair, Minus, Plus, Move, RotateCcw } from "lucide-react";
import type { Flight, Parameters, State } from "../physics/types";
import { fmt } from "../physics/types";
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
  const [camera, setCamera] = useState({ zoom: 1, x: 0, y: 0 }),
    [info, setInfo] = useState(false);
  const [frame, setFrame] = useState<{
    min: number;
    max: number;
    height: number;
  }>();
  const drag = useRef<{ mode: string; x: number; y: number } | null>(null);
  useEffect(() => {
    const observer = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const { w, h } = size,
    minX = frame?.min ?? Math.min(params.x0, ...flight.samples.map((s) => s.x)),
    maxX =
      frame?.max ?? Math.max(params.x0 + 10, ...flight.samples.map((s) => s.x));
  const scale =
    Math.min(
      (w - 120) / Math.max(15, maxX - minX),
      (h - 150) / Math.max(10, frame?.height ?? flight.maxHeight),
    ) * camera.zoom;
  const sx = (x: number) => 64 + (x - minX) * scale + camera.x,
    sy = (y: number) => h - 68 - y * scale + camera.y;
  const world = (x: number, y: number) => ({
    x: (x - 64 - camera.x) / scale + minX,
    y: (h - 68 + camera.y - y) / scale,
  });
  const line = (s: State[]) =>
    s
      .map(
        (v, i) => `${i ? "L" : "M"}${sx(v.x).toFixed(2)},${sy(v.y).toFixed(2)}`,
      )
      .join(" ");
  const sampledMax = Math.max(...flight.samples.map((s) => s.y));
  const traveled = [...flight.samples.filter((s) => s.t < current.t), current];
  const step = 10 ** Math.floor(Math.log10(70 / Math.max(0.01, scale))),
    grid = step * (step * scale < 30 ? 5 : step * scale < 55 ? 2 : 1);
  const xl = world(0, 0).x,
    xr = world(w, 0).x,
    yb = Math.max(0, world(0, h).y),
    yt = world(0, 0).y;
  const xs = Array.from(
    { length: Math.min(100, Math.max(0, Math.ceil((xr - xl) / grid))) },
    (_, i) => Math.ceil(xl / grid) * grid + i * grid,
  );
  const ys = Array.from(
    { length: Math.min(100, Math.max(0, Math.ceil((yt - yb) / grid))) },
    (_, i) => Math.ceil(yb / grid) * grid + i * grid,
  );
  const rad = (params.angle * Math.PI) / 180,
    launch = {
      x: sx(params.x0 + params.speed * Math.cos(rad) * 0.65),
      y: sy(params.height + params.speed * Math.sin(rad) * 0.65),
    };
  const arrow = (
    dx: number,
    dy: number,
    color: string,
    label: string,
    multiplier: number,
  ) => (
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
        width="100%"
        height="100%"
        viewBox={`0 0 ${w} ${h}`}
        role="img"
        aria-label="Интерактивная траектория броска тела"
        onWheel={(e) =>
          setCamera((c) => ({
            ...c,
            zoom: Math.max(
              0.25,
              Math.min(8, c.zoom * (e.deltaY > 0 ? 0.9 : 1.1)),
            ),
          }))
        }
        onPointerDown={(e) => {
          const target = e.target as Element;
          if (target.hasAttribute("data-drag") && !frame)
            setFrame({ min: minX, max: maxX, height: flight.maxHeight });
          drag.current = {
            mode: target.getAttribute("data-drag") || "pan",
            x: e.clientX,
            y: e.clientY,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const rect = e.currentTarget.getBoundingClientRect(),
            p = world(e.clientX - rect.left, e.clientY - rect.top);
          if (drag.current.mode === "launch")
            onParams?.({
              x0: Math.max(-1000, Math.min(1000, p.x)),
              height: Math.max(0, Math.min(1000, p.y)),
            });
          else if (drag.current.mode === "velocity") {
            const dx = p.x - params.x0,
              dy = p.y - params.height;
            onParams?.({
              speed: Math.min(200, Math.hypot(dx, dy) / 0.65),
              angle: Math.max(
                -90,
                Math.min(180, (Math.atan2(dy, dx) * 180) / Math.PI),
              ),
            });
          } else {
            const dx = e.clientX - drag.current.x,
              dy = e.clientY - drag.current.y;
            setCamera((c) => ({ ...c, x: c.x + dx, y: c.y + dy }));
          }
          drag.current.x = e.clientX;
          drag.current.y = e.clientY;
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <defs>
          <radialGradient id="ball">
            <stop stopColor="#fff" />
            <stop offset=".45" stopColor="#adf3ff" />
            <stop offset="1" stopColor="#4cc9ed" />
          </radialGradient>
          <filter id="glow">
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
        <g className="scene-grid">
          {xs.map((x) => (
            <g key={x}>
              <line x1={sx(x)} x2={sx(x)} y1="0" y2={h} />
              <text
                x={sx(x) + 5}
                y={Math.min(h - 17, Math.max(30, sy(0) + 23))}
              >
                {fmt(x, 0)}
              </text>
            </g>
          ))}
          {ys.map((y) => (
            <g key={y}>
              <line x1="0" x2={w} y1={sy(y)} y2={sy(y)} />
              <text
                visibility={sy(y) < 80 ? "hidden" : "visible"}
                x={Math.max(12, Math.min(w - 35, sx(minX) - 30))}
                y={sy(y) - 6}
              >
                {fmt(y, 0)}
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
        {layers.trajectory && (
          <path className="predicted" d={line(flight.samples)} />
        )}
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
            0.65,
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
      <div className="scene-footer">
        <span>
          <Move size={13} /> Перетаскивание · камера
        </span>
        <span>Векторы: v × 0,65 с · a × 0,65 с² · F × 0,4 м/Н</span>
      </div>
      <div className="camera-controls">
        <button
          title="Уменьшить масштаб"
          onClick={() =>
            setCamera((c) => ({ ...c, zoom: Math.max(0.25, c.zoom / 1.25) }))
          }
        >
          <Minus size={16} />
        </button>
        <button
          title="Вписать траекторию"
          onClick={() => {
            setCamera({ zoom: 1, x: 0, y: 0 });
            setFrame(undefined);
          }}
        >
          <Crosshair size={16} />
        </button>
        <button
          title="Увеличить масштаб"
          onClick={() =>
            setCamera((c) => ({ ...c, zoom: Math.min(8, c.zoom * 1.25) }))
          }
        >
          <Plus size={16} />
        </button>
        <button
          title="Сбросить камеру"
          onClick={() => {
            setCamera({ zoom: 1, x: 0, y: 0 });
            setFrame(undefined);
          }}
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}
