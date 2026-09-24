import { NavLink, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/authContextValue";
import Brand from "../components/Brand";
import { FiGrid, FiUploadCloud, FiClock, FiBriefcase, FiLogOut, FiShield, FiUsers, FiFileText, FiCheckSquare, FiAlertCircle, FiRefreshCw } from "react-icons/fi";

const navItems = [
  { to: "/dashboard", label: "Overview", icon: FiGrid },
  { to: "/upload", label: "Upload Resume", icon: FiUploadCloud },
  { to: "/history", label: "History", icon: FiClock },
  { to: "/jobs", label: "Job Search", icon: FiBriefcase },
  { to: "/applications", label: "Applications", icon: FiFileText },
];

const adminNavItems = [
  { to: "/admin", label: "Admin Dashboard", icon: FiShield },
  { to: "/admin/users", label: "User Management", icon: FiUsers },
  { to: "/admin/employers", label: "Approve Employers", icon: FiCheckSquare },
  { to: "/admin/jobs", label: "Moderate Jobs", icon: FiAlertCircle },
  { to: "/admin/feed", label: "External Job Feed", icon: FiRefreshCw },
];

export default function DashboardLayout({ children }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="px-6 py-5">
          <Brand />
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}

          {user?.is_admin && (
            <>
              <div className="my-2 border-t border-slate-100" />
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
                Admin
              </p>
              {adminNavItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/admin"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`
                  }
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="border-t border-slate-200 p-3">
          {user && (
            <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
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
