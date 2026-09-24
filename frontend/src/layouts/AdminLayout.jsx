import { NavLink, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Brand from "../components/Brand";
import {
  FiGrid,
  FiUsers,
  FiBriefcase,
  FiShield,
  FiLogOut,
  FiCheckSquare,
  FiAlertCircle,
  FiRefreshCw,
} from "react-icons/fi";

const adminNavItems = [
  { to: "/admin",           label: "Dashboard",         icon: FiGrid,        end: true },
  { to: "/admin/users",     label: "Manage Users",       icon: FiUsers },
  { to: "/admin/employers", label: "Approve Employers",  icon: FiCheckSquare },
  { to: "/admin/jobs",      label: "Moderate Jobs",      icon: FiAlertCircle },
  { to: "/admin/feed",      label: "External Job Feed",  icon: FiRefreshCw },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="px-6 py-5 border-b border-slate-100">
          <Brand />
          <div className="mt-2 flex items-center gap-1.5">
            <FiShield className="h-3.5 w-3.5 text-purple-600" />
            <span className="text-xs font-semibold uppercase tracking-widest text-purple-600">
              Admin Panel
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {adminNavItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-purple-50 text-purple-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User info + logout */}
        <div className="border-t border-slate-200 p-3">
          {user && (
            <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-purple-100 text-sm font-semibold text-purple-700">
                {(user.name || "?").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
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

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden p-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
