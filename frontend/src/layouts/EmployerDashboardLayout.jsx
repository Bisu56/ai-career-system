import { NavLink, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Brand from "../components/Brand";
import {
  FiGrid,
  FiBriefcase,
  FiUsers,
  FiLogOut,
  FiPlusCircle,
  FiUser,
} from "react-icons/fi";

const navItems = [
  { to: "/employer/dashboard", label: "Overview", icon: FiGrid, end: true },
  { to: "/employer/jobs", label: "My Jobs", icon: FiBriefcase },
  { to: "/employer/jobs/new", label: "Post a Job", icon: FiPlusCircle },
  { to: "/employer/profile", label: "Company Profile", icon: FiUser },
];

export default function EmployerDashboardLayout({ children }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="px-6 py-5">
          <Brand />
          <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
            Employer
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3">
          {user && (
            <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                {(user.name || "?").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {user.name}
                </p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
          >
            <FiLogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden p-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
