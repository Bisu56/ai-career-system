import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmployerDashboardLayout from "../../layouts/EmployerDashboardLayout";
import api from "../../services/api";
import { APP_STATUS_COLORS } from "../../constants/jobs";
import {
  FiBriefcase,
  FiCheckCircle,
  FiXCircle,
  FiUsers,
  FiAlertCircle,
  FiPlusCircle,
  FiUser,
} from "react-icons/fi";


export default function EmployerDashboard() {
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    api.get("/employer/dashboard")
      .then((res) => setStats(res.data))
      .catch(() => setError("Failed to load dashboard data."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <EmployerDashboardLayout>
        <div className="flex h-64 items-center justify-center text-slate-500">Loading…</div>
      </EmployerDashboardLayout>
    );
  }

  if (error) {
    return (
      <EmployerDashboardLayout>
        <div className="flex h-64 items-center justify-center gap-2 text-red-600">
          <FiAlertCircle /> {error}
        </div>
      </EmployerDashboardLayout>
    );
  }

  const cards = [
    { label: "Total Jobs",       value: stats.total_jobs,       icon: FiBriefcase,    tint: "bg-emerald-50 text-emerald-600", to: "/employer/jobs" },
    { label: "Active Jobs",      value: stats.active_jobs,      icon: FiCheckCircle,  tint: "bg-blue-50 text-blue-600",       to: "/employer/jobs?status=active" },
    { label: "Closed Jobs",      value: stats.closed_jobs,      icon: FiXCircle,      tint: "bg-slate-50 text-slate-500",     to: "/employer/jobs?status=closed" },
    { label: "Total Applicants", value: stats.total_applicants, icon: FiUsers,        tint: "bg-brand-50 text-brand-600",   to: "/employer/jobs" },
  ];

  return (
    <EmployerDashboardLayout>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Employer Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your jobs, applicants, and company profile.</p>
        </div>
        <Link
          to="/employer/jobs/new"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <FiPlusCircle className="h-4 w-4" /> Post a Job
        </Link>
      </div>

      {/* Profile completion nudge */}
      {!stats.has_profile && (
        <div className="mt-5 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm text-amber-800">
            <FiAlertCircle className="h-4 w-4 shrink-0" />
            Complete your company profile so applicants can learn about your company.
          </p>
          <Link
            to="/employer/profile"
            className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700"
          >
            Set Up Profile
          </Link>
        </div>
      )}

      {stats.pending_jobs > 0 && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <FiAlertCircle className="h-4 w-4 shrink-0" />
          {stats.pending_jobs} job{stats.pending_jobs !== 1 ? "s are" : " is"} waiting for admin review and not yet visible to job seekers.
        </div>
      )}

      {stats.rejected_jobs > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <FiXCircle className="h-4 w-4 shrink-0" />
          {stats.rejected_jobs} job{stats.rejected_jobs !== 1 ? "s were" : " was"} rejected by an admin. Edit and resubmit from My Jobs.
        </div>
      )}

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tint, to }) => (
          <Link
            key={label}
            to={to}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{label}</span>
              <span className={`grid h-9 w-9 place-items-center rounded-lg ${tint}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
          </Link>
        ))}
      </div>

      {/* Application status breakdown */}
      {stats.total_applicants > 0 && Object.keys(stats.status_counts ?? {}).length > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Applicant Status Breakdown</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.status_counts).map(([status, count]) => (
              <span
                key={status}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${
                  APP_STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                <span className="font-bold">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-slate-900">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/employer/jobs/new"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Post a Job
          </Link>
          <Link
            to="/employer/jobs"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            My Jobs
          </Link>
          <Link
            to="/employer/profile"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <FiUser className="h-4 w-4" />
            {stats.has_profile ? "Edit Profile" : "Create Profile"}
          </Link>
        </div>
      </div>

      {/* Empty state */}
      {stats.total_jobs === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <FiBriefcase className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-slate-500">You haven't posted any jobs yet.</p>
          <Link
            to="/employer/jobs/new"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Post Your First Job
          </Link>
        </div>
      )}
    </EmployerDashboardLayout>
  );
}
