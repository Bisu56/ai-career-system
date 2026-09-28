import AdminLayout from "../../layouts/AdminLayout";
import { Fragment, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../services/api";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import Pagination from "../../components/Pagination";
import { REVIEW_STATUS_COLORS, REVIEW_STATUS_TABS } from "../../constants/jobs";
import { formatDate } from "../../utils/format";
import {
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiTrash2,
  FiExternalLink,
  FiChevronDown,
  FiAlertCircle,
  FiRefreshCw,
  FiInbox,
} from "react-icons/fi";

const SOURCE_TABS = [
  { label: "All Sources", value: "" },
  { label: "Employer", value: "employer" },
  { label: "External", value: "external" },
];

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm capitalize text-slate-700">{value || "-"}</p>
    </div>
  );
}

export default function AdminJobs() {
  const [searchParams] = useSearchParams();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(searchParams.get("status") ?? "pending");
  const [source, setSource] = useState(searchParams.get("source") ?? "");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const latestRequest = useRef(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expanded, setExpanded] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchJobs = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/jobs", { params: { status, source, q: debouncedSearch, page } });
      if (requestId !== latestRequest.current) return;
      setJobs(res.data.data ?? []);
      setTotalPages(res.data.last_page || 1);
      setTotal(res.data.total ?? 0);
    } catch {
      setError("Failed to load jobs.");
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [status, source, debouncedSearch, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const removeFromList = (id) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  };

  const handleModerate = async (job, decision) => {
    setBusyId(job.id);
    setError("");
    setMessage("");
    try {
      const res = await api.patch(`/admin/jobs/${job.id}/${decision}`);
      setMessage(res.data.message);
      if (status && res.data.job.moderation_status !== status) {
        removeFromList(job.id);
      } else {
        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, moderation_status: res.data.job.moderation_status } : j))
        );
      }
    } catch (err) {
      setError(err.response?.data?.error ?? "Action failed. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (job) => {
    if (!confirm(`Delete "${job.title}"? Its applications will be removed too.`)) return;
    setBusyId(job.id);
    setError("");
    setMessage("");
    try {
      await api.delete(`/admin/jobs/${job.id}`);
      removeFromList(job.id);
      setMessage(`Job "${job.title}" deleted.`);
    } catch (err) {
      setError(err.response?.data?.error ?? "Failed to delete job.");
    } finally {
      setBusyId(null);
    }
  };

  const tabClass = (active) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
      active ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Moderate Jobs</h1>
      <p className="mt-1 text-sm text-slate-500">
        Employer postings stay hidden from job seekers until they are approved here.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {REVIEW_STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => { setStatus(t.value); setPage(1); }}
              className={tabClass(status === t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {SOURCE_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => { setSource(t.value); setPage(1); }}
              className={tabClass(source === t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search title or company..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <FiAlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {message && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="mt-5">
        {loading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-slate-500">
            <FiRefreshCw className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <FiInbox className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-slate-500">
              {status === "pending" ? "No jobs waiting for review." : "No jobs found."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3 text-sm text-slate-500">
              {total} job{total !== 1 ? "s" : ""}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Job</th>
                    <th className="px-5 py-3">Source</th>
                    <th className="px-5 py-3">Applicants</th>
                    <th className="px-5 py-3">Posted</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => (
                    <Fragment key={job.id}>
                      <tr
                        className="cursor-pointer transition hover:bg-slate-50"
                        onClick={() => setExpanded(expanded === job.id ? null : job.id)}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-2">
                            <FiChevronDown
                              className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                                expanded === job.id ? "rotate-180" : ""
                              }`}
                            />
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{job.title}</p>
                              <p className="text-xs text-slate-500">
                                {job.company}
                                {job.location ? ` · ${job.location}` : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              job.source === "employer"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-brand-50 text-brand-600"
                            }`}
                          >
                            {job.source}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {job.applications_count ?? 0}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">
                          {formatDate(job.created_at)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="flex flex-wrap gap-1">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                                REVIEW_STATUS_COLORS[job.moderation_status] ?? "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {job.moderation_status}
                            </span>
                            {!job.is_active && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                                Closed
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            {job.moderation_status !== "approved" && (
                              <button
                                onClick={() => handleModerate(job, "approve")}
                                disabled={busyId === job.id}
                                className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                              >
                                <FiCheckCircle className="h-3.5 w-3.5" /> Approve
                              </button>
                            )}
                            {job.moderation_status !== "rejected" && (
                              <button
                                onClick={() => handleModerate(job, "reject")}
                                disabled={busyId === job.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-50 disabled:opacity-50"
                              >
                                <FiXCircle className="h-3.5 w-3.5" /> Reject
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(job)}
                              disabled={busyId === job.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              <FiTrash2 className="h-3.5 w-3.5" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>

                      {expanded === job.id && (
                        <tr className="bg-slate-50">
                          <td colSpan={6} className="px-5 py-5">
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                              <Detail label="Experience" value={job.experience_level} />
                              <Detail label="Employment Type" value={job.employment_type} />
                              <Detail label="Salary" value={job.salary_range} />
                              <Detail label="Deadline" value={formatDate(job.application_deadline)} />
                              <Detail label="Education" value={job.education} />
                              <Detail
                                label="Posted By"
                                value={job.employer ? `${job.employer.name} (${job.employer.email})` : "External feed"}
                              />
                            </div>

                            {job.required_skills?.length > 0 && (
                              <div className="mt-4">
                                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Required Skills
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {job.required_skills.map((skill) => (
                                    <span key={skill} className="rounded-md bg-white px-2 py-0.5 text-xs text-slate-700 ring-1 ring-slate-200">
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="mt-4">
                              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Description
                              </p>
                              <p className="max-h-60 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-slate-600">
                                {job.description || "No description provided."}
                              </p>
                            </div>

                            {!job.accepts_applications && job.url && (
                              <a
                                href={job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline"
                              >
                                View original posting <FiExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </AdminLayout>
  );
}
