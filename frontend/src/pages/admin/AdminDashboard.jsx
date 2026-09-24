import AdminLayout from "../../layouts/AdminLayout";
import { useEffect, useState } from "react";
import api from "../../services/api";
import {
  FiUsers,
  FiFileText,
  FiBriefcase,
  FiTrendingUp,
  FiAlertCircle,
  FiCheckCircle,
  FiUserCheck,
  FiActivity,
} from "react-icons/fi";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/admin/dashboard");
      setStats(res.data);
    } catch (err) {
      setError("Failed to load dashboard stats.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-64 items-center justify-center">
          <p className="text-slate-500">Loading dashboard…</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="rounded-xl bg-red-50 p-6 text-center text-red-600">{error}</div>
      </AdminLayout>
    );
  }

  const statCards = [
    {
      label: "Total Users",
      value: stats.total_users,
      icon: FiUsers,
      tint: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Job Seekers",
      value: stats.total_job_seekers,
      icon: FiActivity,
      tint: "bg-blue-50 text-blue-600",
    },
    {
      label: "Employers",
      value: stats.total_employers,
      icon: FiUserCheck,
      tint: "bg-teal-50 text-teal-600",
    },
    {
      label: "Pending Approvals",
      value: stats.pending_employers,
      icon: FiAlertCircle,
      tint: stats.pending_employers > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-500",
      badge: stats.pending_employers > 0,
    },
    {
      label: "Total Jobs",
      value: stats.total_jobs,
      icon: FiBriefcase,
      tint: "bg-violet-50 text-violet-600",
    },
    {
      label: "Active Jobs",
      value: stats.active_jobs,
      icon: FiCheckCircle,
      tint: "bg-green-50 text-green-600",
    },
    {
      label: "Pending Job Review",
      value: stats.pending_jobs,
      icon: FiAlertCircle,
      tint: stats.pending_jobs > 0 ? "bg-orange-50 text-orange-600" : "bg-slate-50 text-slate-500",
      badge: stats.pending_jobs > 0,
    },
    {
      label: "Total Analyses",
      value: stats.total_analyses,
      icon: FiFileText,
      tint: "bg-pink-50 text-pink-600",
    },
    {
      label: "Avg Resume Score",
      value: `${stats.average_score}%`,
      icon: FiTrendingUp,
      tint: "bg-cyan-50 text-cyan-600",
    },
    {
      label: "Applications",
      value: stats.total_applications,
      icon: FiBriefcase,
      tint: "bg-rose-50 text-rose-600",
    },
  ];

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">System-wide overview and controls</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {statCards.map(({ label, value, icon: Icon, tint, badge }) => (
          <div
            key={label}
            className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            {badge && (
              <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{label}</span>
              <span className={`grid h-9 w-9 place-items-center rounded-lg ${tint}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Quick action links */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickAction
          to="/admin/employers"
          label="Review Pending Employers"
          count={stats.pending_employers}
          color="amber"
        />
        <QuickAction
          to="/admin/jobs"
          label="Review Pending Jobs"
          count={stats.pending_jobs}
          color="orange"
        />
        <QuickAction
          to="/admin/users"
          label="Manage Users"
          count={stats.total_users}
          color="indigo"
        />
        <QuickAction
          to="/admin/feed"
          label="Refresh Job Feed"
          count={null}
          color="teal"
        />
      </div>
    </AdminLayout>
  );
}

function QuickAction({ to, label, count, color }) {
  const colorMap = {
    amber:  "bg-amber-50  hover:bg-amber-100  text-amber-800  border-amber-200",
    orange: "bg-orange-50 hover:bg-orange-100 text-orange-800 border-orange-200",
    indigo: "bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200",
    teal:   "bg-teal-50   hover:bg-teal-100   text-teal-800   border-teal-200",
  };
  return (
    <a
      href={to}
      className={`flex items-center justify-between rounded-xl border p-4 transition ${colorMap[color]}`}
    >
      <span className="text-sm font-semibold">{label}</span>
      {count !== null && (
        <span className="text-lg font-bold">{count}</span>
      )}
    </a>
  );
}
