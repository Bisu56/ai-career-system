import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/authContextValue";
import Brand from "../components/Brand";
import { homePathFor } from "../routes/homePath";

export default function MainLayout({ children }) {
  const { user } = useContext(AuthContext);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <nav className="sticky top-0 z-20 border-b border-slate-200/80 bg-paper/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/">
            <Brand />
          </Link>

          <div className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
            <a href="/#seekers" className="transition hover:text-ink">For job seekers</a>
            <a href="/#employers" className="transition hover:text-ink">For employers</a>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <Link
                to={homePathFor(user)}
                className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 active:scale-[0.98]"
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:text-ink"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 active:scale-[0.98]"
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <Brand />
          <p>Resume analysis and hiring in one place.</p>
        </div>
      </footer>
    </div>
  );
}
