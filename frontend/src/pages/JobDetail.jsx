import { useEffect, useState, useContext, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../services/api";
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS, labelFor } from "../constants/jobs";
import { formatDate } from "../utils/format";
import { AuthContext } from "../context/authContextValue";
import {
  FiBookmark,
  FiExternalLink,
  FiMapPin,
  FiArrowLeft,
  FiCheckCircle,
  FiXCircle,
  FiFileText,
  FiAlertCircle,
} from "react-icons/fi";

const STATUS_LABELS = {
  applied: { label: "Applied", color: "bg-blue-100 text-blue-700" },
  shortlisted: { label: "Shortlisted", color: "bg-yellow-100 text-yellow-700" },
  interview: { label: "Interview", color: "bg-brand-100 text-brand-700" },
  selected: { label: "Selected", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700" },
  withdrawn: { label: "Withdrawn", color: "bg-slate-100 text-slate-600" },
};

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [coverLetter, setCoverLetter] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState("");
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [justApplied, setJustApplied] = useState(false);
  const [savingJob, setSavingJob] = useState(false);

  const fetchJob = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/jobs/${id}`);
      setJob(res.data);
      setApplicationStatus(res.data.application?.status ?? null);
    } catch {
      setError("Job not found.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchJob();
  }, [fetchJob]);

  const handleToggleSave = async () => {
    if (!job || savingJob) return;
    setSavingJob(true);
    try {
      if (job.saved) {
        await api.delete(`/jobs/${job.id}/save`);
        setJob((prev) => ({ ...prev, saved: false }));
      } else {
        await api.post(`/jobs/${job.id}/save`);
        setJob((prev) => ({ ...prev, saved: true }));
      }
    } catch {
      setApplyError("Could not update saved jobs.");
    } finally {
      setSavingJob(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setApplying(true);
    setApplyError("");
    try {
      await api.post(`/jobs/${id}/apply`, { cover_letter: coverLetter });
      setApplicationStatus("applied");
      setJustApplied(true);
      setCoverLetter("");
    } catch (err) {
      setApplyError(
        err.response?.data?.error ||
          err.response?.data?.errors?.cover_letter?.[0] ||
          "Failed to submit application."
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
          <Link to="/jobs" className="text-sm text-brand-600 hover:underline">
            ← Back to jobs
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const statusInfo = applicationStatus ? STATUS_LABELS[applicationStatus] : null;
  const isExternal = !job.accepts_applications;
  const isClosed = job.is_active === false || job.deadline_passed;
  const canApply = !isExternal && !isClosed && !applicationStatus && !user?.is_admin;
  const latestResume = job.latest_resume;
  const skills = job.required_skills?.length ? job.required_skills : job.skills ?? [];

  const facts = [
    { label: "Employment type", value: labelFor(EMPLOYMENT_TYPES, job.employment_type) },
    { label: "Experience", value: labelFor(EXPERIENCE_LEVELS, job.experience_level) },
    { label: "Education", value: job.education },
    { label: "Salary", value: job.salary_range },
    { label: "Apply by", value: job.application_deadline && formatDate(job.application_deadline) },
    { label: "Posted", value: job.posted_at && formatDate(job.posted_at) },
  ].filter((f) => f.value);

  return (
    <DashboardLayout>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition"
      >
        <FiArrowLeft className="h-4 w-4" />
        Back to jobs
      </button>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
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
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs text-brand-600">
                    {isExternal ? job.source : "Posted on CareerAI"}
                  </span>
                  {isClosed && (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs text-red-600">
                      Closed
                    </span>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={handleToggleSave}
                  title={job.saved ? "Unsave" : "Save"}
                  className={`rounded-lg p-2 transition ${
                    job.saved
                      ? "bg-brand-100 text-brand-700 hover:bg-brand-200"
                      : "text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                  }`}
                >
                  <FiBookmark
                    className="h-5 w-5"
                    fill={job.saved ? "currentColor" : "none"}
                  />
                </button>
                {isExternal && (
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    View original <FiExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            {facts.length > 0 && (
              <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
                {facts.map((f) => (
                  <div key={f.label}>
                    <dt className="text-xs text-slate-400">{f.label}</dt>
                    <dd className="mt-0.5 text-sm font-medium text-slate-800">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {skills.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <h2 className="mb-2 text-sm font-semibold text-slate-800">Required skills</h2>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((skill) => {
                    const has = latestResume?.skills?.includes(skill.toLowerCase());
                    return (
                      <span
                        key={skill}
                        className={`rounded-md px-2 py-0.5 text-xs ${
                          has ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {skill}
                      </span>
                    );
                  })}
                </div>
                {latestResume && (
                  <p className="mt-2 text-xs text-slate-400">Green skills are already on your latest resume.</p>
                )}
              </div>
            )}

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

          {job.company_profile && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800">
                About {job.company_profile.company_name}
              </h2>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {job.company_profile.location && <span>{job.company_profile.location}</span>}
                {job.company_profile.website && (
                  <a
                    href={job.company_profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 hover:underline"
                  >
                    {job.company_profile.website}
                  </a>
                )}
                {job.company_profile.contact_email && <span>{job.company_profile.contact_email}</span>}
              </div>
              {job.company_profile.description && (
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                  {job.company_profile.description}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
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
                <Link to="/applications" className="text-brand-600 hover:underline">
                  Applications
                </Link>{" "}
                page.
              </p>
            </div>
          )}

          {canApply && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-800">
                Apply for this job
              </h2>
              {latestResume ? (
                <div className="mb-3 flex items-start gap-2 rounded-lg bg-brand-50 p-3 text-xs text-brand-800">
                  <FiFileText className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Your latest resume{latestResume.original_name ? ` (${latestResume.original_name})` : ""} will be
                    shared with the employer and used for AI ranking.
                  </span>
                </div>
              ) : (
                <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    You haven't uploaded a resume yet.{" "}
                    <Link to="/upload" className="font-semibold underline">
                      Upload one first
                    </Link>{" "}
                    so the employer can see your skills and rank you fairly.
                  </span>
                </div>
              )}
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
                    maxLength={5000}
                    className="block w-full resize-y rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                  <p className="mt-1 text-right text-xs text-slate-400">{coverLetter.length} / 5000</p>
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
                  className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {applying ? "Submitting…" : "Submit Application"}
                </button>
              </form>
            </div>
          )}

          {isExternal && !applicationStatus && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-600">
                This listing comes from <span className="font-semibold">{job.source}</span>. Applications
                are handled on the original posting.
              </p>
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
              >
                Apply on {job.source} <FiExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          {!isExternal && isClosed && !applicationStatus && (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
              <p className="flex items-center gap-2 text-sm font-medium text-red-700">
                <FiXCircle className="h-4 w-4 shrink-0" />
                {job.deadline_passed
                  ? "The application deadline for this job has passed."
                  : "This job is closed and no longer accepting applications."}
              </p>
            </div>
          )}

          {!isExternal && user?.is_admin && !applicationStatus && (
            <div className="rounded-2xl border border-brand-100 bg-brand-50 p-5 text-sm text-brand-800">
              You're signed in as an admin, so you can review this job but not apply to it.
            </div>
          )}

          {justApplied && (
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
