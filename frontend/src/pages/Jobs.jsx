import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import api from "../services/api";
import { EMPLOYMENT_TYPES, EXPERIENCE_LEVELS } from "../constants/jobs";
import { FiSearch, FiBookmark, FiExternalLink, FiRefreshCw, FiCheckCircle } from "react-icons/fi";

const TABS = [
  { value: "search", label: "Browse" },
  { value: "recommended", label: "Recommended" },
  { value: "saved", label: "Saved" },
];

const FILTER_KEYS = ["q", "location", "employment_type", "experience_level", "source"];

const LOAD_ERRORS = {
  search: "Failed to load jobs.",
  recommended: "Failed to load recommendations.",
  saved: "Failed to load saved jobs.",
};

const selectClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function JobCard({ job, onToggleSave, saving }) {
  const isExternal = !job.accepts_applications;
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <Link
          to={`/jobs/${job.id}`}
          className="flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
        >
          {job.title}
        </Link>
        <p className="mt-0.5 text-sm text-slate-600">{job.company}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {job.location && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {job.location}
            </span>
          )}
          {job.employment_type && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs capitalize text-emerald-700">
              {job.employment_type}
            </span>
          )}
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-600">
            {isExternal ? job.source : "Posted on CareerAI"}
          </span>
          {job.applied && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              <FiCheckCircle className="h-3 w-3" /> Applied
            </span>
          )}
        </div>
        {job.matched_skills?.length > 0 && (
          <p className="mt-2 text-xs text-slate-500">
            Matches your skills: {job.matched_skills.join(", ")}
          </p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {job.recommendation_score !== undefined && (
          <span className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700">
            {job.recommendation_score}% match
          </span>
        )}
        {isExternal && (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open original posting"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <FiExternalLink className="h-4 w-4" />
          </a>
        )}
        <button
          type="button"
          onClick={() => onToggleSave(job)}
          disabled={saving}
          title={job.saved ? "Unsave" : "Save"}
          className={`rounded-lg p-2 transition ${
            job.saved
              ? "bg-brand-100 text-brand-700 hover:bg-brand-200"
              : "text-slate-400 hover:bg-slate-100 hover:text-brand-600"
          }`}
        >
          <FiBookmark className="h-4 w-4" fill={job.saved ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  );
}

export default function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.value === searchParams.get("tab"))
    ? searchParams.get("tab")
    : "search";

  const filterKey = FILTER_KEYS.map((k) => searchParams.get(k) ?? "").join("\u0000");
  const filters = useMemo(
    () => Object.fromEntries(filterKey.split("\u0000").map((v, i) => [FILTER_KEYS[i], v])),
    [filterKey]
  );

  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [basedOn, setBasedOn] = useState(null);
  const [input, setInput] = useState(filters.q);
  const [locationInput, setLocationInput] = useState(filters.location);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");

  const activeFilters = useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
    [filters]
  );

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (tab === "search") {
          const res = await api.get("/jobs", { params: { ...activeFilters, page: 1 } });
          if (ignore) return;
          setJobs(res.data.jobs ?? []);
          setTotal(res.data.total ?? 0);
          setPage(res.data.page ?? 1);
          setLastPage(res.data.last_page ?? 1);
        } else if (tab === "recommended") {
          const res = await api.get("/jobs/recommended");
          if (ignore) return;
          setJobs(res.data.jobs);
          setBasedOn(res.data.based_on);
        } else {
          const res = await api.get("/jobs/saved");
          if (ignore) return;
          setJobs(res.data);
        }
      } catch {
        if (!ignore) setError(LOAD_ERRORS[tab]);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [tab, activeFilters]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await api.get("/jobs", { params: { ...activeFilters, page: page + 1 } });
      setJobs((prev) => [...prev, ...res.data.jobs.filter((j) => !prev.some((p) => p.id === j.id))]);
      setPage(res.data.page);
      setLastPage(res.data.last_page);
    } catch {
      setError("Failed to load more jobs.");
    } finally {
      setLoadingMore(false);
    }
  };

  const updateParams = (changes) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    setSearchParams(next);
  };

  const setTab = (value) => {
    updateParams({ tab: value === "search" ? "" : value });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateParams({ q: input.trim(), location: locationInput.trim() });
  };

  const handleFilter = (e) => {
    updateParams({ [e.target.name]: e.target.value });
  };

  const clearFilters = () => {
    setInput("");
    setLocationInput("");
    updateParams(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])));
  };

  const handleToggleSave = async (job) => {
    if (savingId) return;
    setSavingId(job.id);
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
      setError("Could not update saved jobs. Please try again.");
    } finally {
      setSavingId(null);
    }
  };

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Job Search</h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse jobs posted by employers on CareerAI and remote roles from public job boards.
          </p>
        </div>
      </div>

      <div className="mt-5 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm w-fit">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              tab === t.value
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "search" && (
        <div className="mt-4 space-y-3">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Search by title, company or skill…"
                maxLength={200}
                aria-label="Search jobs"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <input
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="Location"
              maxLength={200}
              aria-label="Location"
              className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:w-48"
            />
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition"
            >
              Search
            </button>
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <select name="employment_type" value={filters.employment_type} onChange={handleFilter} className={selectClass}>
              <option value="">Any type</option>
              {EMPLOYMENT_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select name="experience_level" value={filters.experience_level} onChange={handleFilter} className={selectClass}>
              <option value="">Any level</option>
              {EXPERIENCE_LEVELS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select name="source" value={filters.source} onChange={handleFilter} className={selectClass}>
              <option value="">All sources</option>
              <option value="employer">Posted on CareerAI</option>
              <option value="external">External job boards</option>
            </select>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
              >
                Clear filters
              </button>
            )}
            {!loading && (
              <span className="ml-auto text-xs text-slate-400">
                {total} job{total !== 1 ? "s" : ""} found
              </span>
            )}
          </div>
        </div>
      )}

      {tab === "recommended" && basedOn && (
        <p className="mt-4 text-sm text-slate-500">
          Ranked by how well each job's required skills match your latest analysis ({basedOn.career}).
        </p>
      )}

      <div className="mt-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <FiRefreshCw className="h-4 w-4 animate-spin" /> Loading…
          </div>
        )}
        {!loading && error && <p className="text-sm text-red-600">{error}</p>}
        {!loading && !error && jobs.length === 0 && (
          <p className="text-sm text-slate-500">
            {tab === "saved" ? (
              "No saved jobs yet. Browse and bookmark jobs to see them here."
            ) : tab === "recommended" && !basedOn ? (
              <>
                <Link to="/upload" className="text-brand-600 hover:underline">
                  Upload your resume
                </Link>{" "}
                to get recommendations.
              </>
            ) : tab === "recommended" ? (
              "No open jobs match your skills yet."
            ) : (
              "No jobs found. Try a different keyword or clear the filters."
            )}
          </p>
        )}
        <div className="space-y-3">
          {!loading &&
            jobs.map((job) => (
              <JobCard key={job.id} job={job} onToggleSave={handleToggleSave} saving={savingId === job.id} />
            ))}
        </div>
        {!loading && tab === "search" && page < lastPage && (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="mt-4 w-full rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {loadingMore ? "Loading…" : `Show more (${jobs.length} of ${total})`}
          </button>
        )}
      </div>
    </DashboardLayout>
  );
}
