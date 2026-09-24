import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import EmployerDashboardLayout from "../../layouts/EmployerDashboardLayout";
import api from "../../services/api";
import {
  FiArrowLeft,
  FiZap,
  FiRefreshCw,
  FiAlertCircle,
  FiUsers,
  FiCheckCircle,
  FiXCircle,
  FiChevronDown,
} from "react-icons/fi";

// ── Status helpers ──────────────────────────────────────────────────────────
const STATUS_META = {
  applied:     { label: "Applied",     color: "bg-blue-100 text-blue-700",    dot: "bg-blue-500" },
  shortlisted: { label: "Shortlisted", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  interview:   { label: "Interview",   color: "bg-violet-100 text-violet-700", dot: "bg-violet-500" },
  selected:    { label: "Selected",    color: "bg-green-100 text-green-700",   dot: "bg-green-500" },
  rejected:    { label: "Rejected",    color: "bg-red-100 text-red-600",       dot: "bg-red-500" },
  withdrawn:   { label: "Withdrawn",   color: "bg-slate-100 text-slate-600",   dot: "bg-slate-400" },
};

const UPDATABLE_STATUSES = ["applied", "shortlisted", "interview", "selected", "rejected"];

function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? { label: status, color: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${m.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function ScoreBar({ score }) {
  if (score === null || score === undefined) {
    return <span className="text-xs text-slate-400">Not scored</span>;
  }
  const pct  = Math.min(100, Math.max(0, score));
  const color =
    pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-semibold text-slate-700">{pct.toFixed(1)}%</span>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function EmployerApplicants() {
  const { jobId } = useParams();

  const [data, setData]         = useState(null);  // { job, applicants, total }
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [scoring, setScoring]   = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [expanded, setExpanded] = useState(null);  // applicant id with expanded skills

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/employer/jobs/${jobId}/applicants`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error ?? "Failed to load applicants.");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => { load(); }, [load]);

  // Score all applicants
  const handleScoreAll = async () => {
    setScoring(true);
    try {
      await api.post(`/employer/jobs/${jobId}/applicants/score-all`);
      await load(); // reload with updated scores
    } catch (err) {
      alert(err.response?.data?.error ?? "Failed to compute scores.");
    } finally {
      setScoring(false);
    }
  };

  // Update application status
  const handleStatusChange = async (applicationId, status) => {
    setUpdatingId(applicationId);
    try {
      const res = await api.patch(
        `/employer/jobs/${jobId}/applicants/${applicationId}/status`,
        { status }
      );
      setData((prev) => ({
        ...prev,
        applicants: prev.applicants.map((a) =>
          a.id === applicationId ? { ...a, status: res.data.status } : a
        ),
      }));
    } catch (err) {
      alert(err.response?.data?.error ?? "Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <EmployerDashboardLayout>
        <div className="flex h-64 items-center justify-center text-slate-500">
          <FiRefreshCw className="animate-spin mr-2" /> Loading…
        </div>
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

  const { job, applicants } = data;
  const hasScores = applicants.some((a) => a.ai_match_score !== null);

  return (
    <EmployerDashboardLayout>
      {/* Back link */}
      <Link
        to="/employer/jobs"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition"
      >
        <FiArrowLeft className="h-4 w-4" /> Back to My Jobs
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{job.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {applicants.length} applicant{applicants.length !== 1 ? "s" : ""} ·{" "}
            {job.is_active ? (
              <span className="text-green-600 font-medium">Accepting Applications</span>
            ) : (
              <span className="text-slate-500 font-medium">Job Closed</span>
            )}
          </p>
        </div>

        <button
          onClick={handleScoreAll}
          disabled={scoring || applicants.length === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
        >
          {scoring ? (
            <><FiRefreshCw className="h-4 w-4 animate-spin" /> Scoring…</>
          ) : (
            <><FiZap className="h-4 w-4" /> {hasScores ? "Re-score All" : "Score with AI"}</>
          )}
        </button>
      </div>

      {/* Job required skills */}
      {job.required_skills?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="text-xs font-semibold text-slate-500 mr-1 self-center">Required:</span>
          {job.required_skills.map((s) => (
            <span key={s} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{s}</span>
          ))}
        </div>
      )}

      {/* Empty state */}
      {applicants.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FiUsers className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-slate-500">No applicants yet for this job.</p>
        </div>
      )}

      {/* Applicants table */}
      {applicants.length > 0 && (
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 w-8">#</th>
                <th className="px-5 py-3">Applicant</th>
                <th className="px-5 py-3">AI Match Score</th>
                <th className="px-5 py-3">Applied</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Update Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applicants.map((app, idx) => (
                <>
                  <tr
                    key={app.id}
                    className="hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                  >
                    {/* Rank */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        idx === 0 && hasScores ? "bg-amber-100 text-amber-700"
                        : idx === 1 && hasScores ? "bg-slate-200 text-slate-600"
                        : idx === 2 && hasScores ? "bg-orange-100 text-orange-600"
                        : "bg-slate-100 text-slate-500"
                      }`}>
                        {hasScores && app.ai_match_score !== null ? app.rank ?? idx + 1 : idx + 1}
                      </span>
                    </td>

                    {/* Applicant info */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                          {(app.user?.name ?? "?").charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{app.user?.name ?? "—"}</p>
                          <p className="text-xs text-slate-400">{app.user?.email ?? ""}</p>
                        </div>
                        <FiChevronDown
                          className={`h-4 w-4 text-slate-400 transition-transform ${expanded === app.id ? "rotate-180" : ""}`}
                        />
                      </div>
                    </td>

                    {/* AI Match Score */}
                    <td className="px-5 py-4">
                      <ScoreBar score={app.ai_match_score} />
                    </td>

                    {/* Applied date */}
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                      {new Date(app.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Status badge */}
                    <td className="px-5 py-4">
                      <StatusBadge status={app.status} />
                    </td>

                    {/* Status dropdown */}
                    <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      {app.status === "withdrawn" ? (
                        <span className="text-xs text-slate-400 italic">Withdrawn by applicant</span>
                      ) : (
                        <select
                          value={app.status}
                          disabled={updatingId === app.id}
                          onChange={(e) => handleStatusChange(app.id, e.target.value)}
                          className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
                        >
                          {UPDATABLE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </option>
                          ))}
                        </select>
                      )}
                      {updatingId === app.id && (
                        <FiRefreshCw className="inline ml-2 h-3 w-3 animate-spin text-slate-400" />
                      )}
                    </td>
                  </tr>

                  {/* Expanded row: skills breakdown + cover letter */}
                  {expanded === app.id && (
                    <tr key={`${app.id}-detail`} className="bg-slate-50">
                      <td colSpan={6} className="px-5 py-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {/* AI Skills breakdown */}
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              AI Skill Analysis
                            </p>
                            {app.ai_match_score === null ? (
                              <p className="text-xs text-slate-400 italic">
                                Click "Score with AI" to analyse this applicant.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {app.matched_skills?.length > 0 && (
                                  <div>
                                    <p className="mb-1 text-xs font-medium text-green-700">
                                      <FiCheckCircle className="inline mr-1 h-3.5 w-3.5" />
                                      Matched Skills
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {app.matched_skills.map((s) => (
                                        <span key={s} className="rounded-md bg-green-100 px-2 py-0.5 text-xs text-green-800">
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {app.missing_skills?.length > 0 && (
                                  <div>
                                    <p className="mb-1 text-xs font-medium text-red-600">
                                      <FiXCircle className="inline mr-1 h-3.5 w-3.5" />
                                      Missing Skills
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                      {app.missing_skills.map((s) => (
                                        <span key={s} className="rounded-md bg-red-100 px-2 py-0.5 text-xs text-red-700">
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Cover letter */}
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Cover Letter
                            </p>
                            {app.cover_letter ? (
                              <p className="whitespace-pre-line text-xs leading-relaxed text-slate-600 max-h-32 overflow-y-auto">
                                {app.cover_letter}
                              </p>
                            ) : (
                              <p className="text-xs text-slate-400 italic">No cover letter provided.</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>

          {/* Scoring legend */}
          {hasScores && (
            <div className="flex items-center gap-4 border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
              <span className="font-medium">Score guide:</span>
              <span><span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-1" />70%+ Strong match</span>
              <span><span className="inline-block h-2 w-2 rounded-full bg-yellow-500 mr-1" />40–69% Partial match</span>
              <span><span className="inline-block h-2 w-2 rounded-full bg-red-400 mr-1" />&lt;40% Weak match</span>
            </div>
          )}
        </div>
      )}
    </EmployerDashboardLayout>
  );
}
