import type { Flight, Model, Parameters } from "../physics/types";
import { fmt } from "../physics/types";

export default function FormulaGuide({
  flight,
  params,
  model,
}: {
  flight: Flight;
  params: Parameters;
  model?: Model;
}) {
  return (
    <div className="formulas">
      <div className="formula-scope">
        <div className="eyebrow">УРАВНЕНИЯ ДВИЖЕНИЯ</div>
        <p>
          Формулы координат, скорости и характеристик траектории ниже относятся
          только к броску <strong>без сопротивления воздуха</strong> и без
          дополнительных сил, при постоянном g &gt; 0 и h₀ ≥ 0. Ось Oy
          направлена вверх, поверхность — y = 0.
        </p>
        {(model || params.drag) && (
          <p className="formula-active-note">
            Сейчас активна{" "}
            {model
              ? "пользовательская модель"
              : "модель линейного сопротивления"}
            . Формулы идеального броска приведены для справки; текущая
            траектория рассчитывается по модели, описанной в разделе «Физическая
            модель и метод вычисления».
          </p>
        )}
      </div>
      <article>
        <h3>Координаты и перемещение</h3>
        <p className="formula">x(t) = x₀ + v₀ₓt</p>
        <p className="formula">y(t) = h₀ + v₀ᵧt − gt²/2</p>
        <p className="formula">Δx(t) = v₀ₓt</p>
        <p>x₀ и h₀ — координаты запуска; t — время от запуска в секундах.</p>
      </article>
      <article>
        <h3>Скорость и её проекции</h3>
        <p className="formula">v₀ₓ = v₀ cos α</p>
        <p className="formula">v₀ᵧ = v₀ sin α</p>
        <p className="formula">vₓ(t) = v₀ cos α</p>
        <p className="formula">vᵧ(t) = v₀ sin α − gt</p>
        <p className="formula">v(t) = √(vₓ²(t) + vᵧ²(t))</p>
        <p>α — начальный угол к Ox; в интерфейсе он задаётся в градусах.</p>
        <p className="formula">θₓ = arccos(vₓ/v)</p>
        <p className="formula">θᵧ = arccos(vᵧ/v)</p>
        <p>
          Геометрические углы с положительными осями лежат в пределах 0°–180°.
          Эти определения верны для любой модели при v &gt; 0. При v = 0
          направление не определено: в измерениях — «—», на графике — разрыв.
        </p>
      </article>
      <article>
        <h3>Характеристики траектории</h3>
        <p className="formula">
          H<sub>max</sub> = h₀ + v₀ᵧ²/(2g)
        </p>
        <p>
          При v₀ᵧ &gt; 0 вершина достигается в момент t = v₀ᵧ/g. При v₀ᵧ ≤ 0
          максимальная высота на полёте равна h₀ и достигается при запуске.
        </p>
        <p className="formula">T = (v₀ᵧ + √(v₀ᵧ² + 2gh₀))/g</p>
        <p>Время до поверхности y = 0; формула учитывает начальную высоту.</p>
        <p className="formula">L = v₀ₓT</p>
        <p>Горизонтальное перемещение: при движении влево L отрицательно.</p>
        <p className="formula trajectory-formula">
          y(x) = h₀ + (v₀ᵧ/v₀ₓ)(x − x₀)
          <wbr /> − g(x − x₀)²/(2v₀ₓ²)
        </p>
        <p>
          Уравнение y(x) применимо только при v₀ₓ ≠ 0. Для вертикального броска
          x(t) = x₀; высоту находят по y(t), без деления на v₀ₓ.
        </p>
      </article>
      <article>
        <h3>Энергия</h3>
        <p className="formula">
          E<sub>к</sub> = mv²/2
        </p>
        <p className="formula">
          E<sub>п</sub> = mgy
        </p>
        <p className="formula">
          E<sub>мех</sub> = E<sub>к</sub> + E<sub>п</sub>
        </p>
        <p>
          Потенциальная энергия отсчитывается от y = 0 в однородном поле
          тяжести. При идеальном броске механическая энергия сохраняется.
          Сопротивление рассеивает энергию относительно воздуха, а ветер может
          передавать её телу. В авторской модели другие силы могут изменять эту
          сумму; она не включает потенциальную энергию произвольных сил.
        </p>
      </article>
      <article className="formula-method">
        <h3>Физическая модель и метод вычисления</h3>
        <p className="eyebrow">ТЕКУЩИЙ МЕТОД: {flight.method}</p>
        {model ? (
          <>
            <p>Пользовательские силы задают текущую траекторию:</p>
            <p className="formula model-expression">Fₓ = {model.fx}</p>
            <p className="formula model-expression">Fᵧ = {model.fy}</p>
            {Object.keys(model.constants).length > 0 && (
              <p>
                Константы:{" "}
                {Object.entries(model.constants)
                  .map(([name, value]) => `${name} = ${fmt(value, 6)}`)
                  .join("; ")}
                .
              </p>
            )}
            <p className="formula">x′ = vₓ; y′ = vᵧ</p>
            <p className="formula">vₓ′ = Fₓ/m; vᵧ′ = Fᵧ/m</p>
            <p>
              Эта система решается численным методом RK4 с шагом{" "}
              {fmt(model.dt, 3)} с и горизонтом до {fmt(model.duration)} с;
              максимум 20 000 шагов. Для быстро меняющихся сил уменьшайте шаг и
              сравнивайте результат. Максимальная высота оценивается по выборке.
            </p>
          </>
        ) : params.drag ? (
          <>
            <p>Линейное сопротивление относительно скорости воздуха u:</p>
            <p className="formula">Fₓ = −k(vₓ − uₓ)</p>
            <p className="formula">Fᵧ = −mg − k(vᵧ − uᵧ)</p>
            <p>
              Для постоянных k и u используется точное аналитическое решение
              линейной системы с устойчивым вычислением экспоненты. k —
              коэффициент сопротивления в кг/с, u — скорость ветра в м/с. При k
              = 0 решение непрерывно переходит в идеальный бросок.
              Характеристики идеальной траектории выше не являются решением при
              k &gt; 0.
            </p>
          </>
        ) : (
          <p>
            Действует только постоянная сила тяжести Fᵧ = −mg, Fₓ = 0.
            Используется аналитическое решение идеального броска, приведённое
            выше.
          </p>
        )}
        <p>
          Контакт с y = 0 завершает движение; время столкновения уточняется
          бисекцией. Если приземление не найдено, показан ограниченный расчётный
          интервал, а не полное время полёта. Все расчёты выполняются в СИ.
        </p>
        <p>
          Начальные условия: v₀ = {fmt(params.speed)} м/с, α ={" "}
          {fmt(params.angle)}°, h₀ = {fmt(params.height)} м, x₀ ={" "}
          {fmt(params.x0)} м; m = {fmt(params.mass)} кг, g = {fmt(params.g)}{" "}
          м/с².
        </p>
      </article>
    </div>
  );
}
