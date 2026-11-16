import { lazy, Suspense, useState } from "react";
import {
  BrowserRouter,
  HashRouter,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { Moon, Sun, Menu, X, ArrowUpRight } from "lucide-react";
import { Brand } from "./components/Brand";
import { Home, Mechanics, ComingSoon, SECTIONS } from "./pages/Home";
const Laboratory = lazy(() => import("./pages/Laboratory"));
function Shell() {
  const [theme, setTheme] = useState(
      () => localStorage.getItem("physicslab-theme") || "dark",
    ),
    [menu, setMenu] = useState(false);
  const location = useLocation();
  const lab = location.pathname.includes("projectile");
  return (
    <div data-theme={theme} className="app">
      <header className="site-header">
        <Brand />
        <nav className={menu ? "nav-open" : ""} aria-label="Разделы физики">
          {SECTIONS.map((s) => (
            <NavLink key={s.id} to={`/${s.id}`} onClick={() => setMenu(false)}>
              {s.name}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <span className="local-badge">
            <span className="live-dot" /> Локальные вычисления
          </span>
          <button
            title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            onClick={() =>
              setTheme((t) => {
                const n = t === "dark" ? "light" : "dark";
                localStorage.setItem("physicslab-theme", n);
                return n;
              })
            }
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            className="mobile-menu"
            title="Меню разделов"
            onClick={() => setMenu((v) => !v)}
          >
            {menu ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </header>
      <div
        className={lab ? "route lab-route" : "route"}
        key={lab ? "lab" : location.pathname}
      >
        <Suspense
          fallback={
            <div className="loading-state">Подготовка лаборатории…</div>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/mechanics" element={<Mechanics />} />
            <Route path="/mechanics/projectile" element={<Laboratory />} />
            <Route path="*" element={<ComingSoon />} />
          </Routes>
        </Suspense>
      </div>
      {!lab && (
        <footer className="site-footer">
          <Brand />
          <span>Пространство для научного любопытства</span>
          <NavLink to="/mechanics">
            Открыть лабораторию <ArrowUpRight size={14} />
          </NavLink>
        </footer>
      )}
    </div>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
