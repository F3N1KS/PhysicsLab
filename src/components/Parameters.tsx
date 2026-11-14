import { memo, useEffect, useId, useRef, useState } from "react";
import { ChevronDown, SlidersHorizontal, RotateCcw, X } from "lucide-react";
import { DEFAULTS } from "../physics/types";
import type { Parameters } from "../physics/types";
import { LIMITS } from "../physics/limits";
import { niceStep } from "../utils/ticks";
type Key = Exclude<keyof Parameters, "drag">;
function NumericField({
  value,
  label,
  validate,
  commit,
  id,
}: {
  value: number;
  label: string;
  validate: (n: number) => string;
  commit: (n: number) => void;
  id?: string;
}) {
  const [draft, setDraft] = useState(String(value)),
    [error, setError] = useState("");
  const submitted = useRef(value),
    errorId = useId();
  useEffect(() => {
    if (value !== submitted.current) {
      setDraft(String(value));
      setError("");
    }
    submitted.current = value;
  }, [value]);
  const parse = (text: string) =>
    text.trim() &&
    /^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i.test(text.trim())
      ? Number(text.replace(",", "."))
      : NaN;
  return (
    <span className="numeric-field">
      <input
        id={id}
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={draft}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        onChange={(e) => {
          const text = e.target.value;
          setDraft(text);
          const number = parse(text),
            issue = Number.isFinite(number) ? validate(number) : "";
          setError(issue);
          if (Number.isFinite(number) && !issue) {
            submitted.current = number;
            commit(number);
          }
        }}
        onBlur={() => {
          const number = parse(draft);
          setError(
            Number.isFinite(number) ? validate(number) : "Введите число.",
          );
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(String(value));
            setError("");
          }
        }}
      />
      {error && (
        <small id={errorId} className="field-error" role="alert">
          {error}
        </small>
      )}
    </span>
  );
}
export function Parameter({
  label,
  symbol,
  unit,
  value,
  min,
  max,
  step,
  onChange,
  hint,
  safeMin = min,
  safeMax = max,
}: {
  label: string;
  symbol: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  hint?: string;
  safeMin?: number;
  safeMax?: number;
}) {
  const [bounds, setBounds] = useState({ min, max, step }),
    [autoStep, setAutoStep] = useState(true);
  const validate = (n: number) =>
    n >= safeMin && n <= safeMax
      ? ""
      : `Допустимо от ${safeMin} до ${safeMax}.`;
  const automaticStep = (lo: number, hi: number) => niceStep((hi - lo) / 500);
  const expand = (n: number) => {
    onChange(n);
    setBounds((b) => {
      const lo = Math.min(b.min, n),
        hi = Math.max(b.max, n);
      return {
        ...b,
        min: lo,
        max: hi,
        step:
          autoStep && (lo !== b.min || hi !== b.max)
            ? automaticStep(lo, hi)
            : b.step,
      };
    });
  };
  return (
    <div className="parameter">
      <div className="parameter-label">
        <label title={hint} htmlFor={`input-${symbol}`}>
          {label} <i>{symbol}</i>
        </label>
        <span>{unit}</span>
      </div>
      <div className="range-row">
        <input
          aria-label={label}
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={bounds.step}
          value={Math.max(bounds.min, Math.min(bounds.max, value))}
          onChange={(e) => onChange(+e.target.value)}
        />
        <NumericField
          id={`input-${symbol}`}
          label={`${label}: точное значение`}
          value={value}
          validate={validate}
          commit={expand}
        />
      </div>
      <details className="range-settings">
        <summary>Диапазон и шаг</summary>
        <div>
          {(["min", "max", "step"] as const).map((k, i) => (
            <label key={k}>
              {["От", "До", "Шаг"][i]}
              <NumericField
                label={`${label}: ${k}`}
                value={bounds[k]}
                validate={(n) => {
                  if (k === "step")
                    return n > 0 && n <= bounds.max - bounds.min
                      ? ""
                      : "Шаг должен быть положительным и не больше диапазона.";
                  return (
                    validate(n) ||
                    ((k === "min" ? n < bounds.max : n > bounds.min)
                      ? ""
                      : "Нижняя граница должна быть меньше верхней.")
                  );
                }}
                commit={(n) => {
                  if (k === "step") setAutoStep(false);
                  setBounds((b) => {
                    const next = { ...b, [k]: n };
                    return {
                      ...next,
                      step:
                        k !== "step" && autoStep
                          ? automaticStep(next.min, next.max)
                          : next.step,
                    };
                  });
                }}
              />
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}
function ParametersPanel({
  params,
  update,
  close,
  custom,
}: {
  params: Parameters;
  update: (p: Partial<Parameters>) => void;
  close: () => void;
  custom: boolean;
}) {
  const [mode, setMode] = useState("angle");
  const field = (
    key: Key,
    label: string,
    symbol: string,
    unit: string,
    min: number,
    max: number,
    step = 0.1,
    hint?: string,
  ) => (
    <Parameter
      key={key}
      {...{ label, symbol, unit, min, max, step, hint }}
      safeMin={LIMITS[key].min}
      safeMax={LIMITS[key].max}
      value={params[key]}
      onChange={(v) => update({ [key]: v })}
    />
  );
  return (
    <>
      <div className="panel-heading">
        <span>
          <SlidersHorizontal size={16} /> Параметры
        </span>
        <button title="Скрыть параметры" onClick={close}>
          <X size={16} />
        </button>
      </div>
      <div className="panel-content">
        <div className="eyebrow">НАЧАЛЬНЫЕ УСЛОВИЯ</div>
        <div className="segmented throw-modes">
          {[
            ["angle", "Под углом", 45],
            ["vertical", "Вверх", 90],
            ["horizontal", "По горизонтали", 0],
          ].map(([id, label, angle]) => (
            <button
              key={id}
              className={mode === id ? "active" : ""}
              onClick={() => {
                setMode(String(id));
                update({
                  angle: +angle,
                  ...(id === "horizontal" && params.height === 0
                    ? { height: 15 }
                    : {}),
                });
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {field(
          "speed",
          "Начальная скорость",
          "v₀",
          "м/с",
          0,
          200,
          0.5,
          "Модуль скорости тела в момент запуска",
        )}
        {field("angle", "Угол броска", "α", "°", -90, 180, 1)}
        {field("height", "Начальная высота", "h₀", "м", 0, 1000, 0.5)}
        <details>
          <summary>
            Дополнительные условия <ChevronDown size={13} />
          </summary>
          {field("x0", "Координата запуска", "x₀", "м", -1000, 1000)}
          {field("mass", "Масса тела", "m", "кг", 0.01, 100, 0.01)}
        </details>
        <div className="section-divider" />
        <div className="eyebrow">ОКРУЖАЮЩАЯ СРЕДА</div>
        <div className="planet-presets">
          {[
            ["Земля", 9.81],
            ["Луна", 1.62],
            ["Марс", 3.71],
          ].map(([name, g]) => (
            <button
              key={name}
              className={params.g === g ? "active" : ""}
              onClick={() => update({ g: +g })}
            >
              {name}
            </button>
          ))}
        </div>
        {field("g", "Гравитация", "g", "м/с²", 0.01, 50, 0.01)}
        <label className="toggle-row">
          <span>Сопротивление воздуха</span>
          <input
            type="checkbox"
            checked={params.drag}
            disabled={custom}
            onChange={(e) => update({ drag: e.target.checked })}
          />
          <span className="switch" />
        </label>
        {custom && (
          <p className="muted small">Силы определяются в редакторе модели.</p>
        )}
        {(params.drag || custom) && (
          <>
            {field("k", "Коэффициент сопротивления", "k", "кг/с", 0, 10, 0.01)}
            {field("windX", "Ветер по X", "uₓ", "м/с", -100, 100)}
            {field("windY", "Ветер по Y", "uᵧ", "м/с", -100, 100)}
          </>
        )}
        <div className="science-note">
          <span>i</span>
          <p>
            {params.drag || custom
              ? "Силы среды могут изменять механическую энергию тела."
              : "В идеальной среде масса не влияет на траекторию. Механическая энергия сохраняется."}
          </p>
        </div>
        <button
          className="text-button"
          onClick={() => {
            setMode("angle");
            update(DEFAULTS);
          }}
        >
          <RotateCcw size={14} /> Значения по умолчанию
        </button>
      </div>
    </>
  );
}

export default memo(ParametersPanel);
