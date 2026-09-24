import AdminLayout from "../../layouts/AdminLayout";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { APP_STATUS_COLORS } from "../../constants/jobs";
import { formatDate } from "../../utils/format";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";



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
      tint: "bg-brand-50 text-brand-600",
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
      tint: "bg-brand-50 text-brand-600",
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

  const careerData = stats.career_distribution ?? [];
  const jobsBySource = stats.jobs_by_source ?? [];
  const recentAnalyses = stats.recent_analyses ?? [];
  const recentApplications = stats.recent_applications ?? [];

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">System-wide overview and controls</p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              {card.badge && (
                <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">{card.label}</span>
                <span className={`grid h-9 w-9 place-items-center rounded-lg ${card.tint}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-900">{card.value}</p>
            </div>
          );
        })}
      </div>

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

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Career Distribution</h3>
          {careerData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={careerData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis
                  type="category"
                  dataKey="career_prediction"
                  width={140}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                />
                <Tooltip />
                <Bar dataKey="count" name="Analyses" fill="#9333ea" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">No analyses yet.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Jobs by Source</h3>
          {jobsBySource.length > 0 ? (
            <ul className="space-y-2">
              {jobsBySource.map((row) => (
                <li
                  key={row.source}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                >
                  <span className="text-sm font-medium capitalize text-slate-700">{row.source}</span>
                  <span className="text-sm font-bold text-slate-900">{row.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">No jobs yet.</p>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">Recent Analyses</h3>
          </div>
          {recentAnalyses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">User</th>
                    <th className="px-5 py-3">Career</th>
                    <th className="px-5 py-3">Score</th>
                    <th className="px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentAnalyses.map((item) => (
                    <tr key={item.id} className="transition hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-slate-900">{item.user?.name ?? "-"}</p>
                        <p className="text-xs text-slate-400">{item.user?.email ?? ""}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <span className="rounded-md bg-brand-100 px-2 py-1 text-xs font-medium text-brand-800">
                          {item.career_prediction ?? "Unknown"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm font-semibold text-slate-700">
                        {item.resume_score}%
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-500">
                        {formatDate(item.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-6 py-10 text-center text-sm text-slate-500">No analyses yet.</p>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-base font-semibold text-slate-900">Recent Applications</h3>
          </div>
          {recentApplications.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Applicant</th>
                    <th className="px-5 py-3">Job</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentApplications.map((app) => (
                    <tr key={app.id} className="transition hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-3 text-sm font-medium text-slate-900">
                        {app.user?.name ?? "-"}
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-sm text-slate-800">{app.job?.title ?? "-"}</p>
                        <p className="text-xs text-slate-400">{app.job?.company ?? ""}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                            APP_STATUS_COLORS[app.status] ?? "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-sm text-slate-500">
                        {formatDate(app.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-6 py-10 text-center text-sm text-slate-500">No applications yet.</p>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function QuickAction({ to, label, count, color }) {
  const colorMap = {
    amber:  "bg-amber-50  hover:bg-amber-100  text-amber-800  border-amber-200",
    orange: "bg-orange-50 hover:bg-orange-100 text-orange-800 border-orange-200",
    indigo: "bg-brand-50 hover:bg-brand-100 text-brand-800 border-brand-200",
    teal:   "bg-teal-50   hover:bg-teal-100   text-teal-800   border-teal-200",
  };
  return (
    <Link
      to={to}
      className={`flex items-center justify-between rounded-xl border p-4 transition ${colorMap[color]}`}
    >
      <span className="text-sm font-semibold">{label}</span>
      {count !== null && (
        <span className="text-lg font-bold">{count}</span>
      )}
    </Link>
  );
}
