import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import EmployerDashboardLayout from "../../layouts/EmployerDashboardLayout";
import api from "../../services/api";
import {
  FiPlusCircle,
  FiEdit2,
  FiXCircle,
  FiUsers,
  FiRefreshCw,
  FiAlertCircle,
  FiBriefcase,
  FiCheckCircle,
} from "react-icons/fi";

function StatusBadge({ isActive }) {
  return isActive ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Closed
    </span>
  );
}

export default function EmployerJobs() {
  const [searchParams]    = useSearchParams();
  const statusFilter      = searchParams.get("status") ?? "all";

  const [jobs, setJobs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [closingId, setClosingId] = useState(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = statusFilter !== "all" ? { status: statusFilter } : {};
      const res = await api.get("/employer/jobs", { params });
      setJobs(res.data);
    } catch {
      setError("Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleClose = async (job) => {
    if (!confirm(`Close "${job.title}"? No new applications will be accepted.`)) return;
    setClosingId(job.id);
    try {
      const res = await api.patch(`/employer/jobs/${job.id}/close`);
      setJobs((prev) => prev.map((j) => (j.id === job.id ? res.data.job : j)));
    } catch (err) {
      alert(err.response?.data?.error ?? "Failed to close job.");
    } finally {
      setClosingId(null);
    }
  };

  const tabs = [
    { label: "All",    value: "all" },
    { label: "Active", value: "active" },
    { label: "Closed", value: "closed" },
  ];

  return (
    <EmployerDashboardLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Jobs</h1>
          <p className="mt-1 text-sm text-slate-500">Manage all the positions you've posted.</p>
        </div>
        <Link
          to="/employer/jobs/new"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          <FiPlusCircle className="h-4 w-4" /> Post a Job
        </Link>
      </div>

      {/* Status tabs */}
      <div className="mt-5 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
        {tabs.map((t) => (
          <Link
            key={t.value}
            to={t.value === "all" ? "/employer/jobs" : `/employer/jobs?status=${t.value}`}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition ${
              statusFilter === t.value
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mt-5">
        {loading && (
          <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
            <FiRefreshCw className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {!loading && error && (
          <p className="flex items-center gap-2 text-sm text-red-600">
            <FiAlertCircle className="h-4 w-4" /> {error}
          </p>
        )}

        {!loading && !error && jobs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <FiBriefcase className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-slate-500">
              {statusFilter === "active"
                ? "No active jobs."
                : statusFilter === "closed"
                ? "No closed jobs."
                : "You haven't posted any jobs yet."}
            </p>
            <Link
              to="/employer/jobs/new"
              className="mt-4 inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Post Your First Job
            </Link>
          </div>
        )}

        {!loading && !error && jobs.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Job Title</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Applicants</th>
                  <th className="px-5 py-3">Deadline</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-900">{job.title}</p>
                      {job.location && (
                        <p className="text-xs text-slate-400">{job.location}</p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4">
                      {job.employment_type ? (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600 capitalize">
                          {job.employment_type}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        to={`/employer/jobs/${job.id}/applicants`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
                      >
                        <FiUsers className="h-3.5 w-3.5" />
                        {job.applications_count ?? 0}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                      {job.application_deadline
                        ? new Date(job.application_deadline).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge isActive={job.is_active} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          to={`/employer/jobs/${job.id}/applicants`}
                          title="View Applicants"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                        >
                          <FiUsers className="h-3.5 w-3.5" /> Applicants
                        </Link>
                        <Link
                          to={`/employer/jobs/${job.id}/edit`}
                          title="Edit Job"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                        >
                          <FiEdit2 className="h-3.5 w-3.5" /> Edit
                        </Link>
                        {job.is_active && (
                          <button
                            onClick={() => handleClose(job)}
                            disabled={closingId === job.id}
                            title="Close Job"
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            {closingId === job.id ? (
                              <FiRefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <FiXCircle className="h-3.5 w-3.5" />
                            )}{" "}
                            Close
                          </button>
                        )}
                        {!job.is_active && (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-400">
                            <FiCheckCircle className="h-3.5 w-3.5" /> Closed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </EmployerDashboardLayout>
  );
}
