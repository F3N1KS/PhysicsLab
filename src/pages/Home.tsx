import {
  ArrowRight,
  ArrowUpRight,
  Atom,
  AudioLines,
  CircuitBoard,
  Orbit,
  Sun,
  Thermometer,
  MoveUpRight,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
export const SECTIONS = [
  {
    id: "mechanics",
    name: "Механика",
    description: "Движение. Силы. Энергия.",
    icon: Orbit,
  },
  {
    id: "oscillations",
    name: "Колебания",
    description: "Ритм физических систем.",
    icon: AudioLines,
  },
  {
    id: "electricity",
    name: "Электричество и магнетизм",
    description: "Мир полей и зарядов.",
    icon: CircuitBoard,
  },
  {
    id: "optics",
    name: "Оптика",
    description: "Природа и поведение света.",
    icon: Sun,
  },
  {
    id: "thermodynamics",
    name: "Термодинамика",
    description: "Тепло. Работа. Равновесие.",
    icon: Thermometer,
  },
];
export function OrbitArt({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={`orbit-art ${small ? "mini" : ""}`}
      viewBox="0 0 700 470"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="orbit-halo">
          <stop stopColor="#2b9cdb" stopOpacity=".2" />
          <stop offset="1" stopColor="#2b9cdb" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="orbit-line">
          <stop stopColor="#59c9ff" stopOpacity=".05" />
          <stop offset=".6" stopColor="#74d8ff" />
          <stop offset="1" stopColor="#a99bff" />
        </linearGradient>
      </defs>
      <circle cx="350" cy="240" r="230" fill="url(#orbit-halo)" />
      <g className="orbit-grid" stroke="currentColor" opacity=".11">
        {Array.from({ length: 14 }, (_, i) => (
          <path key={i} d={`M${i * 55} 0V470 M0 ${i * 45}H700`} />
        ))}
      </g>
      <g stroke="#7899b2" opacity=".28">
        <ellipse
          cx="350"
          cy="240"
          rx="260"
          ry="80"
          transform="rotate(-27 350 240)"
        />
        <ellipse
          cx="350"
          cy="240"
          rx="225"
          ry="110"
          transform="rotate(45 350 240)"
          strokeDasharray="4 8"
        />
        <circle cx="350" cy="240" r="160" strokeDasharray="2 10" />
        <path d="M350 20v440M70 240h560" strokeDasharray="3 8" />
      </g>
      <path
        d="M95 352 Q300 -120 610 330"
        stroke="url(#orbit-line)"
        strokeWidth="2.5"
      />
      <path
        d="M95 352 Q300 -120 610 330"
        stroke="#59c9ff"
        strokeWidth="12"
        opacity=".06"
      />
      <circle
        className="orbit-particle"
        cx="421"
        cy="149"
        r="7"
        fill="#b3edff"
      />
      <circle cx="421" cy="149" r="21" fill="#59c9ff" opacity=".09" />
      <path d="M421 149l80 30M421 149v67" stroke="#a99bff" strokeWidth="1.4" />
      <text x="510" y="180" fill="#a99bff" fontSize="15">
        v⃗
      </text>
      <text x="434" y="227" fill="#a99bff" fontSize="15">
        g⃗
      </text>
      <circle cx="95" cy="352" r="5" fill="#4dd8bc" />
      <g fill="#8299b3" fontSize="12" fontFamily="monospace">
        <text x="90" y="385">
          t = 0
        </text>
        <text x="490" y="80">
          y = v₀t sin α − gt²/2
        </text>
        <text x="520" y="410">
          СИСТЕМА КООРДИНАТ · СИ
        </text>
        <text x="360" y="38">
          Y
        </text>
        <text x="647" y="257">
          X
        </text>
      </g>
    </svg>
  );
}
export function Home() {
  return (
    <div className="home page">
      <div className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="live-dot" /> ИНТЕРАКТИВНАЯ ФИЗИЧЕСКАЯ ЛАБОРАТОРИЯ
          </span>
          <h1>
            Не просто знать.
            <br />
            <span>Понимать движение.</span>
          </h1>
          <p>
            Превратите формулы в эксперимент.
            <br />
            Меняйте условия, наблюдайте закономерности
            <br className="desktop-label" /> и исследуйте физику своими руками.
          </p>
          <div className="hero-actions">
            <Link className="primary" to="/mechanics/projectile">
              Начать эксперимент <ArrowRight size={18} />
            </Link>
            <a href="#sections" className="text-button">
              Все разделы <ArrowUpRight size={16} />
            </a>
          </div>
          <div className="hero-meta">
            <span>
              01 <small>готовый эксперимент</small>
            </span>
            <i />
            <span>
              ∞ <small>возможностей исследовать</small>
            </span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="visual-corner">PHYSICSLAB / ИССЛЕДОВАНИЕ 001</div>
          <OrbitArt />
          <div className="visual-caption">
            <span>
              <span className="live-dot" /> ФИЗИКА В ДВИЖЕНИИ
            </span>
            <span>v₀ = 25 м/с &nbsp; α = 45°</span>
          </div>
        </div>
      </div>
      <section id="sections" className="sections">
        <div className="section-title">
          <div>
            <div className="eyebrow">ОТ ВОПРОСА К ОТКРЫТИЮ</div>
            <h2>Выберите область исследования</h2>
          </div>
          <span className="muted">Пять направлений. Одна лаборатория.</span>
        </div>
        <div className="section-grid">
          {SECTIONS.map((s, i) => (
            <Link
              key={s.id}
              to={`/${s.id}`}
              className={`section-link ${i === 0 ? "featured" : ""}`}
            >
              <div className="section-icon">
                <s.icon size={27} />
                <span>0{i + 1}</span>
              </div>
              <h3>{s.name}</h3>
              <p>{s.description}</p>
              <div className="section-bottom">
                <span>{i === 0 ? "1 эксперимент" : "Скоро в лаборатории"}</span>
                <ArrowUpRight size={18} />
              </div>
            </Link>
          ))}
        </div>
      </section>
      <div className="home-bottom">
        <Atom size={18} />
        <span>Научная точность. Свобода эксперимента.</span>
        <span className="muted">Без регистрации · Без передачи данных</span>
      </div>
    </div>
  );
}
const experiments = [
  {
    name: "Бросок тела",
    category: "Кинематика",
    description:
      "От первого импульса до приземления. Исследуйте траекторию, скорость и энергию тела.",
    ready: true,
    formula: "y = h₀ + v₀t sin α − gt²/2",
  },
  {
    name: "Прямолинейное движение",
    category: "Кинематика",
    description: "Координата, скорость и ускорение во времени.",
    formula: "x = x₀ + v₀t + at²/2",
  },
  {
    name: "Законы Ньютона",
    category: "Динамика",
    description: "Как силы меняют движение тел.",
    formula: "F = ma",
  },
  {
    name: "Наклонная плоскость",
    category: "Динамика",
    description: "Сила тяжести, трение и равновесие.",
    formula: "F = mg sin α",
  },
  {
    name: "Столкновения",
    category: "Динамика",
    description: "Импульс и взаимодействие тел.",
    formula: "Σp = const",
  },
  {
    name: "Механическая энергия",
    category: "Энергия",
    description: "Превращение энергии и работа сил.",
    formula: "E = mv²/2 + mgh",
  },
  {
    name: "Движение по окружности",
    category: "Кинематика",
    description: "Период, частота и центростремительное ускорение.",
    formula: "a = v²/r",
  },
  {
    name: "Гравитация и орбиты",
    category: "Гравитация",
    description: "Законы притяжения в космическом масштабе.",
    formula: "F = Gm₁m₂/r²",
  },
];
export function Mechanics() {
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("Все эксперименты");
  const filtered = experiments.filter(
    (e) =>
      (category === "Все эксперименты" || e.category === category) &&
      `${e.name} ${e.description}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="catalog page">
      <div className="catalog-hero">
        <div>
          <div className="eyebrow">РАЗДЕЛ 01 / МИР В ДВИЖЕНИИ</div>
          <h1>
            Механика<span className="title-dot">.</span>
          </h1>
          <p>
            Понять, почему всё движется.
            <br />
            От простого броска до законов Вселенной.
          </p>
        </div>
        <div className="catalog-equation">
          F<span>→</span> = ma<span>→</span>
          <small>СИЛА МЕНЯЕТ ДВИЖЕНИЕ</small>
        </div>
      </div>
      <div className="catalog-toolbar">
        <div className="filter-tabs">
          {[
            "Все эксперименты",
            "Кинематика",
            "Динамика",
            "Энергия",
            "Гравитация",
          ].map((c) => (
            <button
              key={c}
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Поиск эксперимента…"
          aria-label="Поиск экспериментов"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="experiments-grid">
        {filtered.map((e, i) => (
          <article
            className={`experiment-card ${e.ready ? "ready" : ""}`}
            key={e.name}
          >
            <div className="experiment-art">
              {e.ready ? <OrbitArt small /> : <span>{e.formula}</span>}
              <span className="experiment-number">0{i + 1}</span>
            </div>
            <div className="experiment-copy">
              <span className="eyebrow">{e.category}</span>
              <h2>{e.name}</h2>
              <p>{e.description}</p>
              {e.ready ? (
                <Link className="primary" to="/mechanics/projectile">
                  Открыть лабораторию <ArrowUpRight size={16} />
                </Link>
              ) : (
                <span className="coming-badge">В разработке</span>
              )}
            </div>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <p className="empty-state">
          Эксперименты не найдены. Попробуйте другой запрос.
        </p>
      )}
    </div>
  );
}
export function ComingSoon() {
  const { pathname } = useLocation();

  const section = SECTIONS.find(
    (s) => pathname === `/${s.id}`
  );

  return (
    <div className="coming-page page">
      <div className="icon-tile">
        <MoveUpRight size={28} />
      </div>
      <span className="eyebrow">НОВОЕ НАПРАВЛЕНИЕ</span>
      <h1>{section?.name ?? "Страница не найдена"}</h1>
      <p>
        {section
          ? "Мы готовим новые инструменты для ваших открытий. Этот раздел пока не реализован."
          : "Проверьте адрес или вернитесь в лабораторию."}
      </p>
      <Link className="primary" to="/mechanics">
        Исследовать механику <ArrowRight size={17} />
      </Link>
    </div>
  );
}
