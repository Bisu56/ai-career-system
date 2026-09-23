import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../services/api";
import {
  FiBookmark,
  FiExternalLink,
  FiMapPin,
  FiArrowLeft,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";

const STATUS_LABELS = {
  applied: { label: "Applied", color: "bg-blue-100 text-blue-700" },
  shortlisted: { label: "Shortlisted", color: "bg-yellow-100 text-yellow-700" },
  interview: { label: "Interview", color: "bg-violet-100 text-violet-700" },
  selected: { label: "Selected", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
  withdrawn: { label: "Withdrawn", color: "bg-slate-100 text-slate-600" },
};

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Application state
  const [coverLetter, setCoverLetter] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applicationStatus, setApplicationStatus] = useState(null); // null | status string

  useEffect(() => {
    fetchJob();
    fetchApplicationStatus();
  }, [id]);

  const fetchJob = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/jobs/${id}`);
      setJob(res.data);
    } catch {
      setError("Job not found.");
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicationStatus = async () => {
    try {
      const res = await api.get("/applications");
      const match = res.data.find((a) => String(a.job_listing_id) === String(id));
      if (match) setApplicationStatus(match.status);
    } catch {
      // ignore
    }
  };

  const handleToggleSave = async () => {
    if (!job) return;
    try {
      if (job.saved) {
        await api.delete(`/jobs/${job.id}/save`);
        setJob((prev) => ({ ...prev, saved: false }));
      } else {
        await api.post(`/jobs/${job.id}/save`);
        setJob((prev) => ({ ...prev, saved: true }));
      }
    } catch {
      // silently ignore
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setApplying(true);
    setApplyError("");
    try {
      await api.post(`/jobs/${id}/apply`, { cover_letter: coverLetter });
      setApplicationStatus("applied");
      setCoverLetter("");
    } catch (err) {
      setApplyError(
        err.response?.data?.error || "Failed to submit application."
      );
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <p className="text-slate-500">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !job) {
    return (
      <DashboardLayout>
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <p className="text-slate-500">{error || "Job not found."}</p>
          <Link to="/jobs" className="text-sm text-indigo-600 hover:underline">
            ← Back to jobs
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const statusInfo = applicationStatus ? STATUS_LABELS[applicationStatus] : null;
  const canApply = job.is_active !== false && !applicationStatus;

  return (
    <DashboardLayout>
      {/* Back link */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition"
      >
        <FiArrowLeft className="h-4 w-4" />
        Back to jobs
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Main panel ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job header */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900">{job.title}</h1>
                <p className="mt-1 text-sm font-medium text-slate-600">{job.company}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {job.location && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                      <FiMapPin className="h-3 w-3" />
                      {job.location}
                    </span>
                  )}
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs text-indigo-600">
                    {job.source}
                  </span>
                  {job.is_active === false && (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs text-red-600">
                      Closed
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {/* Save button */}
                <button
                  onClick={handleToggleSave}
                  title={job.saved ? "Unsave" : "Save"}
                  className={`rounded-lg p-2 transition ${
                    job.saved
                      ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                      : "text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
                  }`}
                >
                  <FiBookmark
                    className="h-5 w-5"
                    fill={job.saved ? "currentColor" : "none"}
                  />
                </button>
                {/* External link */}
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  View original <FiExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Skills */}
            {job.skills && job.skills.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {job.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {job.description && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-800">
                  About this role
                </h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                  {job.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar: apply / status ─────────────────────────────────── */}
        <div className="space-y-4">
          {/* Application status card */}
          {statusInfo && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="mb-2 text-sm font-semibold text-slate-800">
                Your Application
              </p>
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${statusInfo.color}`}
              >
                {statusInfo.label}
              </span>
              <p className="mt-2 text-xs text-slate-500">
                You can track your application from the{" "}
                <Link to="/applications" className="text-indigo-600 hover:underline">
                  Applications
                </Link>{" "}
                page.
              </p>
            </div>
          )}

          {/* Apply form */}
          {canApply && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">
                Apply for this job
              </h2>
              <form onSubmit={handleApply} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Cover Letter{" "}
                    <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea
                    rows={5}
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Tell the employer why you're a great fit..."
                    className="block w-full resize-y rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                {applyError && (
                  <p className="flex items-center gap-1.5 text-sm text-red-600">
                    <FiXCircle className="h-4 w-4 shrink-0" />
                    {applyError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={applying}
                  className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {applying ? "Submitting…" : "Submit Application"}
                </button>
              </form>
            </div>
          )}

          {/* Closed notice */}
          {job.is_active === false && !applicationStatus && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-red-700">
                <FiXCircle className="h-4 w-4 shrink-0" />
                This job is closed and no longer accepting applications.
              </p>
            </div>
          )}

          {/* Already applied success banner */}
          {applicationStatus === "applied" && (
            <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-green-700">
                <FiCheckCircle className="h-4 w-4 shrink-0" />
                Application submitted! Check your status in{" "}
                <Link to="/applications" className="underline">
                  Applications
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
