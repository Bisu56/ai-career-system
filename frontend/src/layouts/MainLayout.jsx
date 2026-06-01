import { Link, NavLink } from "react-router-dom";
import Brand from "../components/Brand";

export default function MainLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link to="/">
            <Brand />
          </Link>

          <div className="flex items-center gap-1">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "text-indigo-600"
                    : "text-slate-600 hover:text-slate-900"
                }`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              Login
            </NavLink>
            <Link
              to="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <div>{children}</div>
    </div>
  );
}
