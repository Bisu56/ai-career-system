import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../services/api";
import { formatDate } from "../utils/format";
import {
  FiExternalLink,
  FiRefreshCw,
  FiInbox,
  FiXCircle,
} from "react-icons/fi";

const STATUS_META = {
  applied: {
    label: "Applied",
    color: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  shortlisted: {
    label: "Shortlisted",
    color: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-500",
  },
  interview: {
    label: "Interview",
    color: "bg-brand-100 text-brand-700",
    dot: "bg-brand-500",
  },
  selected: {
    label: "Selected",
    color: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 text-red-600",
    dot: "bg-red-500",
  },
  withdrawn: {
    label: "Withdrawn",
    color: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
};

const ALL_STATUSES = Object.keys(STATUS_META);

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || {
    label: status,
    color: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.color}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}


export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [withdrawingId, setWithdrawingId] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/applications");
      setApplications(res.data);
    } catch {
      setError("Failed to load applications.");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (id) => {
    if (!confirm("Withdraw this application?")) return;
    setWithdrawingId(id);
    try {
      const res = await api.patch(`/applications/${id}/withdraw`);
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: res.data.status } : a))
      );
    } catch (err) {
      alert(err.response?.data?.error || "Could not withdraw application.");
    } finally {
      setWithdrawingId(null);
    }
  };

  const displayed =
    filterStatus === "all"
      ? applications
      : applications.filter((a) => a.status === filterStatus);

  // Summary counts
  const counts = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          My Applications
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Track the status of every job you've applied for.
        </p>
      </div>

      {/* Summary badges */}
      {applications.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus("all")}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${
              filterStatus === "all"
                ? "bg-slate-800 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({applications.length})
          </button>
          {ALL_STATUSES.filter((s) => counts[s]).map((s) => {
            const meta = STATUS_META[s];
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  filterStatus === s
                    ? `${meta.color} ring-2 ring-offset-1 ring-current`
                    : `${meta.color} opacity-80 hover:opacity-100`
                }`}
              >
                {meta.label} ({counts[s]})
              </button>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div className="mt-5">
        {loading && (
          <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
            <FiRefreshCw className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}

        {!loading && error && (
          <p className="flex items-center gap-2 py-4 text-sm text-red-600">
            <FiXCircle className="h-4 w-4" /> {error}
          </p>
        )}

        {!loading && !error && applications.length === 0 && (
          <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <FiInbox className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-slate-500">You haven't applied for any jobs yet.</p>
            <Link
              to="/jobs"
              className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition"
            >
              Browse Jobs
            </Link>
          </div>
        )}

        {!loading && !error && applications.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Job</th>
                    <th className="px-5 py-3">Company</th>
                    <th className="px-5 py-3">Applied</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayed.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-4">
                        <Link
                          to={`/jobs/${app.job_listing_id}`}
                          className="text-sm font-medium text-brand-700 hover:underline"
                        >
                          {app.job?.title ?? "-"}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                        {app.job?.company ?? "-"}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                        {formatDate(app.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {app.job?.url && !app.job?.accepts_applications && (
                            <a
                              href={app.job.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition"
                            >
                              <FiExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {!["withdrawn", "rejected", "selected"].includes(
                            app.status
                          ) && (
                            <button
                              onClick={() => handleWithdraw(app.id)}
                              disabled={withdrawingId === app.id}
                              className="text-sm text-red-500 hover:text-red-700 transition disabled:opacity-50"
                            >
                              {withdrawingId === app.id ? "…" : "Withdraw"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {displayed.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">
                  No applications with status "{filterStatus}".
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
