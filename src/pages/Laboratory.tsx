import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Code2,
  Expand,
  Eye,
  FlaskConical,
  Gauge,
  Layers3,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightOpen,
  Pause,
  Play,
  Repeat2,
  RotateCcw,
  Save,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import Scene, { INITIAL_LAYERS } from "../components/Scene";
import type { Layers } from "../components/Scene";
import ParametersPanel from "../components/Parameters";
const Analysis = lazy(() => import("../components/Analysis"));
import ModelEditor from "../components/ModelEditor";
import { calculate } from "../physics/engine";
import { DEFAULTS, fmt } from "../physics/types";
import type { Model, Parameters, Run } from "../physics/types";
import { usePlayback } from "../hooks/usePlayback";
const layerLabels: Record<keyof Layers, string> = {
  trajectory: "Вся траектория",
  velocity: "Вектор скорости",
  acceleration: "Вектор ускорения",
  gravity: "Сила тяжести",
  resistance: "Сопротивление",
  projections: "Проекции",
  coordinates: "Координаты тела",
  points: "Характерные точки",
  ghosts: "Равные интервалы времени",
};
export default function Laboratory() {
  const [params, setParams] = useState<Parameters>(DEFAULTS),
    [model, setModel] = useState<Model>(),
    [mode, setMode] = useState("experiment");
  const [layers, setLayers] = useState(INITIAL_LAYERS),
    [settings, setSettings] = useState(false),
    [left, setLeft] = useState(() => window.innerWidth > 700),
    [right, setRight] = useState(() => window.innerWidth > 950),
    [analysis, setAnalysis] = useState(false),
    [full, setFull] = useState(false);
  const [widths, setWidths] = useState({ left: 282, right: 236 }),
    [runs, setRuns] = useState<Run[]>([]),
    [toast, setToast] = useState("");
  const [snapshot, setSnapshot] = useState<{
    params: Parameters;
    model?: Model;
    time: number;
    layers: Layers;
  }>(() => {
    try {
      const data = JSON.parse(
        sessionStorage.getItem("physicslab-snapshot") || "null",
      );
      return data?.params && Number.isFinite(data.time) && data.layers
        ? data
        : undefined;
    } catch {
      return undefined;
    }
  });
  useEffect(() => {
    if (snapshot)
      sessionStorage.setItem("physicslab-snapshot", JSON.stringify(snapshot));
  }, [snapshot]);
  const serial = useRef(1),
    root = useRef<HTMLDivElement>(null);
  const result = useMemo(() => {
    try {
      return { flight: calculate(params, model), error: "" };
    } catch (e) {
      return { flight: calculate(DEFAULTS), error: (e as Error).message };
    }
  }, [params, model]);
  const { flight } = result,
    playback = usePlayback(flight.duration),
    current = flight.at(playback.time);
  const update = (patch: Partial<Parameters>) => {
    playback.reset();
    setParams((p) => ({ ...p, ...patch }));
  };
  const addRun = () => {
    const id = serial.current++;
    setRuns((r) => [
      ...r.slice(-5),
      {
        id,
        name: `Запуск ${id}`,
        flight,
        params: { ...params },
        color: [
          "#b39aff",
          "#4dd8bc",
          "#ffbe7c",
          "#ee89b5",
          "#bddc6b",
          "#829fff",
        ][(id - 1) % 6],
      },
    ]);
    setToast("Запуск добавлен к сравнению");
  };
  const resize = (side: "left" | "right", event: React.PointerEvent) => {
    const start = event.clientX,
      width = widths[side];
    event.currentTarget.setPointerCapture(event.pointerId);
    const handle = event.currentTarget as HTMLElement;
    const move = (e: PointerEvent) =>
      setWidths((w) => ({
        ...w,
        [side]: Math.max(
          210,
          Math.min(
            400,
            width + (e.clientX - start) * (side === "left" ? 1 : -1),
          ),
        ),
      }));
    const end = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
  };
  const setView = (value: string) => {
    setMode(value);
    setAnalysis(value === "analysis");
  };
  return (
    <div className={`laboratory ${full ? "workspace-full" : ""}`} ref={root}>
      <div className="lab-heading">
        <div>
          <div className="breadcrumb">
            Механика <span>/</span> Эксперимент 01
          </div>
          <h1>
            Бросок тела <span className="badge">2D</span>
          </h1>
        </div>
        <div
          className="mode-tabs"
          role="tablist"
          aria-label="Режим лаборатории"
        >
          {[
            ["experiment", "Эксперимент", FlaskConical],
            ["analysis", "Анализ", Activity],
            ["model", "Редактор модели", Code2],
          ].map(([id, label, Icon]) => {
            const I = Icon as typeof Activity;
            return (
              <button
                role="tab"
                aria-selected={mode === id}
                key={String(id)}
                className={mode === id ? "active" : ""}
                onClick={() => setView(String(id))}
              >
                <I size={16} />
                <span>{String(label)}</span>
              </button>
            );
          })}
        </div>
        <div className="lab-tools">
          <button
            className="secondary snapshot"
            onClick={() => {
              setSnapshot({
                params: { ...params },
                model,
                time: playback.time,
                layers: { ...layers },
              });
              setToast("Снимок сохранён в текущей сессии");
            }}
          >
            <Save size={15} /> Снимок
          </button>
          {snapshot && (
            <button
              title="Восстановить снимок"
              onClick={() => {
                setParams(snapshot.params);
                setModel(snapshot.model);
                setLayers(snapshot.layers);
                playback.seek(
                  snapshot.time,
                  calculate(snapshot.params, snapshot.model).duration,
                );
                setToast("Снимок восстановлен");
              }}
            >
              <RotateCcw size={16} />
            </button>
          )}
          <button
            title="Настройки отображения"
            className={settings ? "selected" : ""}
            onClick={() => setSettings((v) => !v)}
          >
            <Layers3 size={19} />
          </button>
          <button
            title={
              full ? "Свернуть рабочую область" : "Развернуть рабочую область"
            }
            onClick={() => setFull((v) => !v)}
          >
            <Expand size={19} />
          </button>
        </div>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
          <button title="Закрыть уведомление" onClick={() => setToast("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {result.error && (
        <div className="error-message" role="alert">
          Модель остановлена: {result.error} Показана стандартная траектория.{" "}
          <button
            onClick={() => {
              setModel(undefined);
              update(DEFAULTS);
            }}
          >
            Сбросить модель
          </button>
        </div>
      )}
      <div className="workspace-toolbar">
        <div className="button-group">
          <button
            title={left ? "Скрыть параметры" : "Показать параметры"}
            className={!left ? "selected" : ""}
            onClick={() => setLeft((v) => !v)}
          >
            {left ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
            <span>Параметры</span>
          </button>
          <span className="toolbar-divider" />
          <span className="environment-status">
            <span className="live-dot" />{" "}
            {model
              ? "Авторская модель"
              : params.drag
                ? "Воздушная среда"
                : "Без сопротивления воздуха"}
          </span>
        </div>
        <div className="button-group">
          <span className="muted small desktop-label">Единицы СИ</span>
          <button
            title={right ? "Скрыть измерения" : "Показать измерения"}
            onClick={() => setRight((v) => !v)}
          >
            <PanelRightOpen size={16} />
            <span>Измерения</span>
          </button>
        </div>
      </div>
      <div
        className={`workspace mode-${mode} ${analysis ? "with-analysis" : ""}`}
      >
        {left && (
          <aside
            className="parameters-panel side-panel"
            style={{ width: widths.left }}
          >
            <ParametersPanel
              params={params}
              update={update}
              close={() => setLeft(false)}
              custom={!!model}
            />
            <div
              className="resize-handle resize-right"
              role="separator"
              aria-label="Ширина параметров"
              aria-orientation="vertical"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowRight")
                  setWidths((w) => ({
                    ...w,
                    left: Math.max(
                      210,
                      Math.min(
                        400,
                        w.left + (e.key === "ArrowRight" ? 10 : -10),
                      ),
                    ),
                  }));
              }}
              onPointerDown={(e) => resize("left", e)}
            />
          </aside>
        )}
        <main className="scene-column">
          {mode === "model" && (
            <ModelEditor
              params={params}
              active={model}
              apply={(m) => {
                playback.reset();
                setModel(m);
              }}
              deactivate={() => {
                playback.reset();
                setModel(undefined);
              }}
            />
          )}
          <Scene
            {...{ flight, params, current, layers }}
            onParams={update}
            custom={!!model}
          />
          {!flight.landed && (
            <div className="horizon-note">
              Приземление не найдено в пределах {fmt(flight.duration, 0)} с.
              Показан ограниченный интервал.
            </div>
          )}
        </main>
        {right && (
          <aside
            className="measurements-panel side-panel"
            style={{ width: widths.right }}
          >
            <div
              className="resize-handle resize-left"
              role="separator"
              aria-label="Ширина измерений"
              aria-orientation="vertical"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft" || e.key === "ArrowRight")
                  setWidths((w) => ({
                    ...w,
                    right: Math.max(
                      210,
                      Math.min(
                        400,
                        w.right + (e.key === "ArrowLeft" ? 10 : -10),
                      ),
                    ),
                  }));
              }}
              onPointerDown={(e) => resize("right", e)}
            />
            <div className="panel-heading">
              <span>
                <Gauge size={16} /> Измерения
              </span>
              <button title="Скрыть измерения" onClick={() => setRight(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="panel-content">
              <div className="eyebrow">ТЕКУЩИЙ МОМЕНТ</div>
              <div className="time-readout">
                <Clock3 size={16} />
                <strong data-testid="hud-time">{fmt(current.t)}</strong>
                <span>с</span>
              </div>
              <div className="measurement-pair">
                <div>
                  <label>Координата X</label>
                  <strong>
                    {fmt(current.x)} <small>м</small>
                  </strong>
                </div>
                <div>
                  <label>Высота Y</label>
                  <strong>
                    {fmt(current.y)} <small>м</small>
                  </strong>
                </div>
              </div>
              <div className="metric-primary">
                <span>
                  <ArrowUpRight size={17} /> Скорость
                </span>
                <strong>
                  {fmt(current.speed)} <small>м/с</small>
                </strong>
              </div>
              <div className="measurement-pair compact">
                <div>
                  <label>vₓ, м/с</label>
                  <strong>{fmt(current.vx)}</strong>
                </div>
                <div>
                  <label>vᵧ, м/с</label>
                  <strong>{fmt(current.vy)}</strong>
                </div>
              </div>
              <div className="metric-line">
                <span>Ускорение</span>
                <strong>
                  {fmt(Math.hypot(current.ax, current.ay))} <small>м/с²</small>
                </strong>
              </div>
              <div className="measurement-pair compact">
                <div>
                  <label>aₓ, м/с²</label>
                  <strong>{fmt(current.ax)}</strong>
                </div>
                <div>
                  <label>aᵧ, м/с²</label>
                  <strong>{fmt(current.ay)}</strong>
                </div>
              </div>
              <div className="section-divider" />
              <div className="eyebrow">ЭНЕРГИЯ</div>
              {[
                ["Кинетическая", current.ek, "cyan"],
                ["Потенциальная", current.ep, "violet"],
                ["Механическая", current.energy, "green"],
              ].map(([name, value, color]) => (
                <div className="metric-line" key={name}>
                  <span>
                    <i className={`metric-dot ${color}`} />
                    {name}
                  </span>
                  <strong>
                    {fmt(+value, 1)} <small>Дж</small>
                  </strong>
                </div>
              ))}
              <div className="section-divider" />
              <div className="eyebrow">
                {flight.landed ? "ВЕСЬ ПОЛЁТ · РАСЧЁТ" : "РАСЧЁТНЫЙ ИНТЕРВАЛ"}
              </div>
              <div className="flight-stats">
                {[
                  ["Макс. высота", flight.maxHeight, "м"],
                  ["Дальность", flight.range, "м"],
                  ["Время полёта", flight.duration, "с"],
                ].map(([name, value, unit]) => (
                  <div key={name}>
                    <span>{name}</span>
                    <strong>
                      {fmt(+value)} <small>{unit}</small>
                    </strong>
                  </div>
                ))}
              </div>
              <button className="text-button" onClick={addRun}>
                <Activity size={14} /> Добавить к сравнению
              </button>
            </div>
          </aside>
        )}
        {settings && (
          <div className="layers-popover">
            <div className="panel-heading">
              <span>
                <Eye size={16} /> Визуальные слои
              </span>
              <button title="Закрыть слои" onClick={() => setSettings(false)}>
                <X size={16} />
              </button>
            </div>
            {Object.entries(layerLabels).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={layers[key as keyof Layers]}
                  onChange={(e) =>
                    setLayers((l) => ({ ...l, [key]: e.target.checked }))
                  }
                />
                {label}
              </label>
            ))}
          </div>
        )}
      </div>
      <div className="playback">
        <button
          className={`play-button ${playback.playing ? "is-playing" : ""}`}
          title={playback.playing ? "Пауза" : "Запуск"}
          aria-label={playback.playing ? "Пауза" : "Запуск"}
          disabled={!!result.error || !flight.duration}
          onClick={playback.toggle}
        >
          {playback.playing ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" />
          )}
        </button>
        <div className="playback-steps">
          <button title="Сброс" onClick={playback.reset}>
            <RotateCcw size={17} />
          </button>
          <button
            title="Шаг назад"
            onClick={() => playback.seek(playback.time - 0.05)}
          >
            <SkipBack size={17} />
          </button>
          <button
            title="Шаг вперёд"
            onClick={() => playback.seek(playback.time + 0.05)}
          >
            <SkipForward size={17} />
          </button>
        </div>
        <div className="timeline">
          <div>
            <span data-testid="timeline-time">
              {fmt(playback.time)} <small>с</small>
            </span>
            <span>{fmt(flight.duration)} с</span>
          </div>
          <input
            aria-label="Временная шкала"
            type="range"
            min="0"
            max={flight.duration || 1}
            step=".001"
            value={playback.time}
            onChange={(e) => playback.seek(+e.target.value)}
          />
        </div>
        <select
          aria-label="Скорость воспроизведения"
          value={playback.speed}
          onChange={(e) => playback.setSpeed(+e.target.value)}
        >
          {[0.25, 0.5, 1, 2, 4].map((n) => (
            <option key={n} value={n}>
              {n}×
            </option>
          ))}
        </select>
        <button
          className={playback.loop ? "selected" : ""}
          title="Повторять воспроизведение"
          aria-pressed={playback.loop}
          onClick={() => playback.setLoop((v) => !v)}
        >
          <Repeat2 size={19} />
        </button>
        <button
          className="analysis-toggle secondary"
          onClick={() => {
            setAnalysis((v) => !v);
            if (mode === "model") setMode("experiment");
          }}
        >
          <Activity size={16} />
          <span>Аналитика</span>
          {analysis ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>
      {analysis && mode !== "model" && (
        <Suspense
          fallback={<div className="loading-state">Подготовка графиков…</div>}
        >
          <Analysis
            {...{ flight, params, runs, setRuns, addRun }}
            time={playback.time}
            seek={playback.seek}
          />
        </Suspense>
      )}
      <footer className="lab-footer">
        <span>
          <span className="live-dot" /> Все вычисления на вашем устройстве
        </span>
        <span>{flight.method}</span>
        <span>
          <ArrowDown size={12} /> y = 0 · поверхность
        </span>
      </footer>
    </div>
  );
}
