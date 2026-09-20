import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../services/api";
import { FiSearch, FiBookmark, FiExternalLink, FiRefreshCw } from "react-icons/fi";

function JobCard({ job, onToggleSave }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:underline"
        >
          {job.title}
          <FiExternalLink className="h-3.5 w-3.5 shrink-0" />
        </a>
        <p className="mt-0.5 text-sm text-slate-600">{job.company}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {job.location && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {job.location}
            </span>
          )}
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">
            {job.source}
          </span>
        </div>
      </div>
      <button
        onClick={() => onToggleSave(job)}
        title={job.saved ? "Unsave" : "Save"}
        className={`shrink-0 rounded-lg p-2 transition ${
          job.saved
            ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
            : "text-slate-400 hover:bg-slate-100 hover:text-indigo-600"
        }`}
      >
        <FiBookmark className="h-4 w-4" fill={job.saved ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [keyword, setKeyword] = useState("python");
  const [input, setInput] = useState("python");
  const [tab, setTab] = useState("search"); // "search" | "saved"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchJobs = useCallback(async (q) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/jobs", { params: { q } });
      setJobs(res.data);
    } catch {
      setError("Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSaved = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/jobs/saved");
      setJobs(res.data);
    } catch {
      setError("Failed to load saved jobs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "search") fetchJobs(keyword);
    else fetchSaved();
  }, [tab, keyword, fetchJobs, fetchSaved]);

  const handleSearch = (e) => {
    e.preventDefault();
    setKeyword(input.trim() || "python");
  };

  const handleToggleSave = async (job) => {
    try {
      if (job.saved) {
        await api.delete(`/jobs/${job.id}/save`);
      } else {
        await api.post(`/jobs/${job.id}/save`);
      }
      setJobs((prev) =>
        prev
          .map((j) => (j.id === job.id ? { ...j, saved: !j.saved } : j))
          .filter((j) => tab !== "saved" || j.saved)
      );
    } catch {
      // silently ignore
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Job Search</h1>
          <p className="mt-1 text-sm text-slate-500">Browse remote jobs matched to your skills.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
        {["search", "saved"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition ${
              tab === t
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t === "search" ? "Browse" : "Saved"}
          </button>
        ))}
      </div>

      {/* Search bar */}
      {tab === "search" && (
        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search by title, company, or location…"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            Search
          </button>
        </form>
      )}

      {/* Results */}
      <div className="mt-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <FiRefreshCw className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
        {!loading && error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && jobs.length === 0 && (
          <p className="text-sm text-slate-500">
            {tab === "saved"
              ? "No saved jobs yet. Browse and bookmark jobs to see them here."
              : "No jobs found. Try a different keyword or refresh the listings."}
          </p>
        )}
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onToggleSave={handleToggleSave} />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
