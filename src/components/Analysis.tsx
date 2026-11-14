import { memo, useEffect, useMemo, useState, useRef } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Plus, Minus, Maximize2, X, Trash2 } from "lucide-react";
import type { Flight, Parameters, Run, State } from "../physics/types";
import type { RefObject } from "react";
import { axisTicks, formatTick } from "../utils/ticks";
import { fmt, LABELS } from "../physics/types";
export function downloadFile(content: BlobPart, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
type Series = { name: string; color: string; flight: Flight; id?: number }[];
type Domains = {
  x: ReturnType<typeof axisTicks>;
  y: ReturnType<typeof axisTicks>;
};
const StaticPlot = memo(function StaticPlot({
  series,
  x,
  y,
  domains,
}: {
  series: Series;
  x: keyof State;
  y: keyof State;
  domains: Domains;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        margin={{ top: 15, right: 20, left: 0, bottom: 0 }}
        accessibilityLayer={false}
      >
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis
          dataKey={x}
          type="number"
          domain={[domains.x.min, domains.x.max]}
          ticks={domains.x.values}
          height={30}
          allowDataOverflow
          tickFormatter={(v) => formatTick(v, domains.x.step)}
          stroke="var(--muted)"
          fontSize={11}
          minTickGap={25}
        />
        <YAxis
          type="number"
          domain={[domains.y.min, domains.y.max]}
          ticks={domains.y.values}
          allowDataOverflow
          tickFormatter={(v) => formatTick(v, domains.y.step)}
          width={68}
          stroke="var(--muted)"
          fontSize={11}
        />
        {series.map((run, i) => (
          <Line
            key={run.id ?? "current"}
            name={run.name}
            data={run.flight.samples}
            dataKey={y}
            type="linear"
            stroke={run.color}
            strokeWidth={i ? 1.7 : 2.5}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
});
function ChartCursor({
  flight,
  clock,
  x,
  xMin,
  xMax,
}: {
  flight: Flight;
  clock: RefObject<number>;
  x: keyof State;
  xMin: number;
  xMax: number;
}) {
  const ref = useRef<SVGLineElement>(null);
  useEffect(() => {
    let id: number,
      last = -Infinity;
    const tick = (now: number) => {
      if (now - last >= 1000 / 30 && ref.current) {
        const time = clock.current,
          percent = ((flight.at(time)[x] - xMin) / (xMax - xMin)) * 100;
        ref.current.setAttribute("x1", `${percent}%`);
        ref.current.setAttribute("x2", `${percent}%`);
        ref.current.setAttribute("data-time", String(time));
        last = now;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [flight, clock, x, xMin, xMax]);
  return (
    <svg className="chart-overlay" aria-hidden="true">
      <line
        className="chart-time-cursor"
        ref={ref}
        x1="0"
        x2="0"
        y1="0"
        y2="100%"
        stroke="#b39aff"
        strokeDasharray="4 4"
      />
    </svg>
  );
}
function makeTable(flight: Flight, step: number) {
  return Array.from(
    { length: Math.min(5001, Math.floor(flight.duration / step) + 1) },
    (_, i) => flight.at(i * step),
  );
}
function Chart({
  flight,
  runs,
  clock,
  seek,
  index,
  remove,
}: {
  flight: Flight;
  runs: Run[];
  clock: RefObject<number>;
  seek: (t: number) => void;
  index: number;
  remove?: () => void;
}) {
  const [x, setX] = useState<keyof State>("t"),
    [y, setY] = useState<keyof State>(
      ["y", "speed", "energy", "vy"][index] as keyof State,
    ),
    [large, setLarge] = useState(false),
    [zoom, setZoom] = useState(1),
    [hover, setHover] = useState<{ value: number; left: number }>();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const wheel = (e: WheelEvent) => {
      if (!e.altKey) return;
      e.preventDefault();
      setZoom((v) =>
        Math.max(1, Math.min(16, v * Math.exp(-e.deltaY * 0.002))),
      );
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, []);
  const exportSvg = () => {
    const svg = ref.current?.querySelector("svg.recharts-surface");
    if (svg) {
      const clone = svg.cloneNode(true) as SVGElement;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clone.setAttribute(
        "style",
        "background:#101c2c;color:#9bb1ca;font-family:sans-serif;--grid:#243247;--muted:#9bb1ca;--cyan:#65d4f3",
      );
      const cursor =
        ref.current?.querySelector<SVGLineElement>(".chart-time-cursor");
      if (cursor) {
        const percent = parseFloat(cursor.getAttribute("x1") || "0") / 100;
        if (percent >= 0 && percent <= 1) {
          const exported = cursor.cloneNode(true) as SVGLineElement;
          const bounds = svg.getBoundingClientRect(),
            px = 68 + percent * (bounds.width - 88);
          exported.setAttribute("x1", String(px));
          exported.setAttribute("x2", String(px));
          exported.setAttribute("y1", "15");
          exported.setAttribute("y2", String(bounds.height - 30));
          clone.appendChild(exported);
        }
      }
      downloadFile(
        new XMLSerializer().serializeToString(clone),
        "image/svg+xml",
        `physicslab-${y}-${x}.svg`,
      );
    }
  };
  const series = useMemo(
    () => [{ name: "Текущий запуск", color: "var(--cyan)", flight }, ...runs],
    [flight, runs],
  );
  const domains = useMemo(() => {
    let low = Infinity,
      high = -Infinity,
      yMin = Infinity,
      yMax = -Infinity;
    for (const run of series)
      for (const state of run.flight.samples) {
        low = Math.min(low, state[x]);
        high = Math.max(high, state[x]);
        yMin = Math.min(yMin, state[y]);
        yMax = Math.max(yMax, state[y]);
      }
    const domain = axisTicks(low, high),
      center = (domain.min + domain.max) / 2,
      span = domain.max - domain.min;
    return {
      x: axisTicks(center - span / (2 * zoom), center + span / (2 * zoom)),
      y: axisTicks(yMin, yMax),
    };
  }, [series, x, y, zoom]);
  const xMin = domains.x.min,
    xMax = domains.x.max;
  const closest = (f: Flight, value: number) =>
    f.samples.reduce((a, b) =>
      Math.abs(a[x] - value) <= Math.abs(b[x] - value) ? a : b,
    );
  const pointerValue = (event: React.PointerEvent<HTMLDivElement>) => {
    const plot = event.currentTarget
      .querySelector(".recharts-cartesian-grid")
      ?.getBoundingClientRect();
    if (
      !plot ||
      !plot.width ||
      event.clientX < plot.left ||
      event.clientX > plot.right ||
      event.clientY < plot.top ||
      event.clientY > plot.bottom
    )
      return undefined;
    const ratio = (event.clientX - plot.left) / plot.width;
    return xMin + ratio * (xMax - xMin);
  };
  return (
    <div className={`chart-panel ${large ? "chart-expanded" : ""}`} ref={ref}>
      <div className="chart-heading">
        <div className="axis-selects">
          <select
            aria-label={`График ${index + 1}: ось Y`}
            value={y}
            onChange={(e) => setY(e.target.value as keyof State)}
          >
            {Object.entries(LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <span>от</span>
          <select
            aria-label={`График ${index + 1}: ось X`}
            value={x}
            onChange={(e) => {
              setX(e.target.value as keyof State);
              setZoom(1);
            }}
          >
            {Object.entries(LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="button-group">
          <button
            title="Уменьшить масштаб графика"
            onClick={() => setZoom((v) => Math.max(1, v / 1.5))}
          >
            <Minus size={14} />
          </button>
          <button
            title="Увеличить масштаб графика"
            onClick={() => setZoom((v) => Math.min(16, v * 1.5))}
          >
            <Plus size={14} />
          </button>
          <button title="Экспорт графика SVG" onClick={exportSvg}>
            <Download size={14} />
          </button>
          <button
            title={large ? "Уменьшить график" : "Увеличить график"}
            onClick={() => setLarge((v) => !v)}
          >
            <Maximize2 size={14} />
          </button>
          {remove && (
            <button title="Удалить график" onClick={remove}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      <div
        className="chart-area"
        onPointerMove={(e) => {
          const value = pointerValue(e);
          setHover(
            value === undefined
              ? undefined
              : {
                  value,
                  left: Math.min(
                    e.currentTarget.clientWidth - 225,
                    Math.max(
                      0,
                      e.clientX -
                        e.currentTarget.getBoundingClientRect().left +
                        14,
                    ),
                  ),
                },
          );
        }}
        onPointerLeave={() => setHover(undefined)}
        onPointerDown={(e) => {
          const value = pointerValue(e);
          if (value !== undefined)
            seek(x === "t" ? value : closest(flight, value).t);
        }}
      >
        <StaticPlot {...{ series, x, y, domains }} />
        <ChartCursor {...{ flight, clock, x, xMin, xMax }} />
        {hover && (
          <svg
            className="chart-overlay"
            width="100%"
            height="100%"
            aria-hidden="true"
          >
            <line
              x1={`${((hover.value - xMin) / (xMax - xMin)) * 100}%`}
              x2={`${((hover.value - xMin) / (xMax - xMin)) * 100}%`}
              y1="0"
              y2="100%"
              stroke="var(--muted)"
              strokeDasharray="2 3"
            />
          </svg>
        )}
        {hover && (
          <div
            className="plot-tooltip"
            style={{
              position: "absolute",
              left: Math.max(0, hover.left),
              top: 8,
              pointerEvents: "none",
              zIndex: 5,
            }}
          >
            <strong>
              {LABELS[x]}: {fmt(hover.value, 3)}
            </strong>
            <p className="muted">{LABELS[y]}</p>
            {series.map((run, i) => (
              <p key={i} style={{ color: run.color }}>
                {run.name}:{" "}
                {fmt(
                  (x === "t"
                    ? run.flight.at(hover.value)
                    : closest(run.flight, hover.value))[y],
                  3,
                )}
              </p>
            ))}
          </div>
        )}
      </div>
      <div className="chart-hint">
        Нажмите на кривую, чтобы выбрать момент · Alt + колесо или ±: масштаб
        {x !== "t" &&
          " · При повторяющемся X выбирается ближайший отсчёт текущего запуска"}
      </div>
    </div>
  );
}
function Analysis({
  flight,
  params,
  runs,
  setRuns,
  clock,
  seek,
  addRun,
}: {
  flight: Flight;
  params: Parameters;
  runs: Run[];
  setRuns: (r: Run[]) => void;
  clock: RefObject<number>;
  seek: (t: number) => void;
  addRun: () => void;
}) {
  const [tab, setTab] = useState("charts"),
    [count, setCount] = useState(2),
    [step, setStep] = useState(0.2);
  const table = useMemo(
    () => (tab === "table" ? makeTable(flight, step) : []),
    [flight, step, tab],
  );
  const exportCsv = () => {
    const keys = Object.keys(LABELS) as (keyof State)[];
    downloadFile(
      "\uFEFF" +
        keys.map((k) => LABELS[k]).join(";") +
        "\n" +
        (tab === "table" ? table : makeTable(flight, step))
          .map((s) =>
            keys.map((k) => s[k].toFixed(6).replace(".", ",")).join(";"),
          )
          .join("\n"),
      "text/csv;charset=utf-8",
      "physicslab.csv",
    );
  };
  return (
    <section className="analysis">
      <div className="analysis-top">
        <div className="underline-tabs">
          {[
            ["charts", "Графики"],
            ["table", "Таблица"],
            ["formulas", "Формулы и метод"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="button-group">
          <button className="secondary" onClick={addRun}>
            <Plus size={15} /> К сравнению
          </button>
          <button className="secondary" onClick={exportCsv}>
            <Download size={15} /> CSV
          </button>
        </div>
      </div>
      {tab === "charts" && (
        <>
          <div className="run-legend">
            <span>
              <i style={{ background: "#59c9ff" }} /> Текущий запуск
            </span>
            {runs.map((run) => (
              <span key={run.id}>
                <i style={{ background: run.color }} />
                {run.name}
                <button
                  title={`Удалить ${run.name}`}
                  onClick={() => setRuns(runs.filter((r) => r.id !== run.id))}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            {runs.length > 0 && (
              <button className="text-button" onClick={() => setRuns([])}>
                <Trash2 size={12} /> Очистить
              </button>
            )}
            <button
              className="add-chart"
              disabled={count >= 4}
              onClick={() => setCount((c) => c + 1)}
            >
              <Plus size={14} /> График {count}/4
            </button>
          </div>
          <div className={`charts-grid charts-${count}`}>
            {Array.from({ length: count }, (_, i) => (
              <Chart
                key={i}
                index={i}
                {...{ flight, runs, clock, seek }}
                remove={count > 1 ? () => setCount((c) => c - 1) : undefined}
              />
            ))}
          </div>
        </>
      )}
      {tab === "table" && (
        <>
          <div className="table-tools">
            <label>
              Шаг таблицы, с{" "}
              <input
                aria-label="Шаг таблицы"
                type="number"
                min="0.01"
                max="100"
                step=".01"
                value={step}
                onChange={(e) =>
                  setStep(
                    Math.max(
                      0.01,
                      Math.min(100, e.target.valueAsNumber || 0.2),
                    ),
                  )
                }
              />
            </label>
            <span className="muted">
              {table.length} строк · максимум 5001 · нажмите строку для
              измерения
            </span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {[
                    "t, с",
                    "x, м",
                    "y, м",
                    "vₓ, м/с",
                    "vᵧ, м/с",
                    "|v|, м/с",
                    "Eк, Дж",
                    "Eп, Дж",
                  ].map((v) => (
                    <th key={v}>{v}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.map((s, i) => (
                  <tr
                    key={i}
                    onClick={() => seek(s.t)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") seek(s.t);
                    }}
                  >
                    {[s.t, s.x, s.y, s.vx, s.vy, s.speed, s.ek, s.ep].map(
                      (v, j) => (
                        <td key={j}>{fmt(v)}</td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tab === "formulas" && (
        <div className="formulas">
          <article>
            <div className="eyebrow">УРАВНЕНИЯ ДВИЖЕНИЯ</div>
            <p className="formula">x(t) = x₀ + v₀ cos α · t</p>
            <p className="formula">y(t) = h₀ + v₀ sin α · t − gt²/2</p>
            <p>
              Без сопротивления используется аналитическое решение. Для F = −k(v
              − u) используется точное решение линейного уравнения с устойчивым
              вычислением экспоненты.
            </p>
            <p className="formula">Eк = mv²/2 · Eп = mgy</p>
          </article>
          <article>
            <div className="eyebrow">РАСЧЁТНЫЙ МЕТОД</div>
            <h3>{flight.method}</h3>
            <p>
              Земля: y = 0. Время столкновения уточняется бисекцией. В
              пользовательской модели работает RK4 с ограничением в 20 000
              шагов. Высота пользовательской модели оценивается по выборке.
            </p>
            <p>
              Начальные условия: v₀ = {fmt(params.speed)} м/с, α ={" "}
              {fmt(params.angle)}°, h₀ = {fmt(params.height)} м; m ={" "}
              {fmt(params.mass)} кг, g = {fmt(params.g)} м/с².
            </p>
            <p>
              Все расчёты в СИ. При сопротивлении энергия рассеивается, ветер
              может передавать энергию телу.
            </p>
          </article>
        </div>
      )}
    </section>
  );
}

export default memo(Analysis);
