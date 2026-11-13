import { useState } from "react";
import { Check, Code2, Play, AlertCircle } from "lucide-react";
import { calculate } from "../physics/engine";
import { DEFAULT_MODEL } from "../physics/types";
import type { Model, Parameters } from "../physics/types";
export default function ModelEditor({
  params,
  apply,
  active,
  deactivate,
}: {
  params: Parameters;
  apply: (m: Model) => void;
  active?: Model;
  deactivate: () => void;
}) {
  const [fx, setFx] = useState(active?.fx ?? DEFAULT_MODEL.fx),
    [fy, setFy] = useState(active?.fy ?? DEFAULT_MODEL.fy),
    [constants, setConstants] = useState(
      active
        ? Object.entries(active.constants)
            .map(([k, v]) => `${k} = ${v}`)
            .join("\n")
        : "",
    );
  const [dt, setDt] = useState(active?.dt ?? 0.01),
    [duration, setDuration] = useState(active?.duration ?? 30),
    [error, setError] = useState(""),
    [ok, setOk] = useState(false);
  const submit = () => {
    try {
      const entries = constants
        .split("\n")
        .filter((s) => s.trim())
        .map((line) => {
          const match =
            /^\s*([a-zA-Z_][a-zA-Z_0-9]*)\s*=\s*(-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*$/.exec(
              line,
            );
          if (!match)
            throw new Error("Константы: по одной на строку, например c = 0.5");
          return [match[1], Number(match[2])] as const;
        });
      if (new Set(entries.map((e) => e[0])).size !== entries.length)
        throw new Error("Имена констант не должны повторяться.");
      const model: Model = {
        fx,
        fy,
        dt,
        duration,
        constants: Object.fromEntries(entries),
      };
      calculate(params, model);
      apply(model);
      setError("");
      setOk(true);
    } catch (e) {
      setError((e as Error).message);
      setOk(false);
    }
  };
  return (
    <section className="model-editor">
      <div className="editor-title">
        <div className="icon-tile">
          <Code2 size={22} />
        </div>
        <div>
          <h2>Создайте свой закон движения</h2>
          <p>Задайте силы. Посмотрите, как изменится траектория.</p>
        </div>
      </div>
      <div className="editor-grid">
        <div>
          <label className="code-label">
            Горизонтальная сила <span>Fₓ, Н</span>
            <textarea
              aria-label="Формула Fx"
              value={fx}
              onChange={(e) => {
                setFx(e.target.value);
                setOk(false);
              }}
              spellCheck={false}
            />
          </label>
          <label className="code-label">
            Вертикальная сила <span>Fᵧ, Н</span>
            <textarea
              aria-label="Формула Fy"
              value={fy}
              onChange={(e) => {
                setFy(e.target.value);
                setOk(false);
              }}
              spellCheck={false}
            />
          </label>
          <div className="science-note">
            <p>
              Переменные: t, x, y, vx, vy, m, g, k, ux, uy.
              <br />
              Функции: sin, cos, tan, sqrt, abs, exp, log.
              <br />
              Операции: + − * / ^, скобки. Константы: pi, e.
            </p>
          </div>
        </div>
        <div>
          <label className="code-label">
            Пользовательские константы
            <textarea
              aria-label="Константы модели"
              placeholder={"c = 0.5\nA = 2"}
              value={constants}
              onChange={(e) => {
                setConstants(e.target.value);
                setOk(false);
              }}
              spellCheck={false}
            />
          </label>
          <div className="solver-inputs">
            <label>
              Шаг RK4, с
              <input
                aria-label="Шаг RK4"
                type="number"
                step=".001"
                min=".001"
                max=".1"
                value={dt}
                onChange={(e) => setDt(e.target.valueAsNumber)}
              />
            </label>
            <label>
              Горизонт, с
              <input
                aria-label="Горизонт модели"
                type="number"
                min=".1"
                max="120"
                value={duration}
                onChange={(e) => setDuration(e.target.valueAsNumber)}
              />
            </label>
          </div>
          <p className="muted small">
            Начальные условия задаются в панели параметров. Предпросмотр справа
            показывает применённую модель. Доступны только компоненты сил в
            двумерной системе.
          </p>
          <button className="text-button" onClick={deactivate}>
            Вернуться к стандартной модели
          </button>
        </div>
      </div>
      {error && (
        <div className="error-message" role="alert">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      {ok && (
        <div className="success-message" role="status">
          <Check size={18} /> Модель применена. Траектория пересчитана.
        </div>
      )}
      <button className="primary" onClick={submit}>
        <Play size={16} /> Применить модель
      </button>
    </section>
  );
}
