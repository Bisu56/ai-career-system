import DashboardLayout from "../layouts/DashboardLayout";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
  FiSearch,
  FiMapPin,
  FiHome,
  FiBriefcase,
  FiExternalLink,
  FiRefreshCw,
  FiDollarSign,
  FiList,
  FiCreditCard,
} from "react-icons/fi";
import JobCarousel from "../components/JobCarousel";

const matchColor = (m) =>
  m >= 60
    ? "bg-green-100 text-green-800"
    : m >= 35
    ? "bg-amber-100 text-amber-800"
    : "bg-slate-100 text-slate-600";

function timeAgo(iso) {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return then.toLocaleDateString();
}

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [resume, setResume] = useState(null);
  const [meta, setMeta] = useState(null);
  const [homeCity, setHomeCity] = useState("");
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minMatch, setMinMatch] = useState(0);
  // "cards" walks the deck one job at a time; "list" is the full scroll.
  const [view, setView] = useState("cards");

  // Filters can be passed explicitly so a button can apply a new value and
  // fetch in one go, instead of waiting a render for state to settle.
  const fetchJobs = useCallback(
    async ({ refresh = false, ...overrides } = {}) => {
      const active = {
        search,
        location,
        remoteOnly,
        minMatch,
        ...overrides,
      };
      refresh ? setRefreshing(true) : setLoading(true);
      setError("");
      try {
        // Only send the filters that are actually set, and send booleans as
        // 1/0 - axios serialises `false` as the string "false", which Laravel's
        // validator rejects.
        const params = { limit: 40 };
        if (active.search.trim()) params.search = active.search.trim();
        if (active.location.trim()) params.location = active.location.trim();
        if (active.remoteOnly) params.remote_only = 1;
        if (active.minMatch > 0) params.min_match = active.minMatch;
        if (refresh) params.refresh = 1;

        const { data } = await api.get("/jobs", { params });
        setJobs(data.jobs || []);
        setTotal(data.total || 0);
        setResume(data.resume || null);
        setHomeCity(data.home_location_city || "");
        setMeta(data.meta || null);
        setMessage(data.message || "");
      } catch (err) {
        const body = err.response?.data;
        // Surface the real reason - a validation message names the bad filter,
        // which is far more useful than a generic "service down".
        const detail =
          body?.error ||
          body?.message ||
          Object.values(body?.errors || {})[0]?.[0];
        setError(
          detail || "Could not load jobs. Check that all three services are running."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, location, remoteOnly, minMatch]
  );

  // Initial load only; filters are applied on submit so typing doesn't spam
  // the job APIs.
  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    fetchJobs();
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Job Portal</h1>
          <p className="mt-1 text-sm text-slate-500">
            Live openings from Jobicy and Arbeitnow, ranked against the skills
            in your resume.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 p-0.5">
            {[
              { id: "cards", label: "Cards", Icon: FiCreditCard },
              { id: "list", label: "List", Icon: FiList },
            ].map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setView(option.id)}
                aria-pressed={view === option.id}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  view === option.id
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <option.Icon className="h-4 w-4" />
                {option.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchJobs({ refresh: true })}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <FiRefreshCw className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Fetching..." : "Refresh"}
          </button>
        </div>
      </div>

      {resume && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Matching against your{" "}
              <span className="font-medium text-slate-800">
                {resume.career || "latest"}
              </span>{" "}
              resume
            </p>
            {resume.location && (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                  <FiHome className="h-3.5 w-3.5" />
                  {resume.location}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLocation(homeCity);
                    fetchJobs({ location: homeCity });
                  }}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Only show jobs here
                </button>
              </div>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {resume.skills?.map((s) => (
              <span
                key={s}
                className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
          <FiSearch className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Role, company, skill"
            className="w-full text-sm outline-none"
          />
        </label>

        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
          <FiMapPin className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location"
            className="w-full text-sm outline-none"
          />
        </label>

        <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
          <span className="whitespace-nowrap">Min match</span>
          <input
            type="range"
            min="0"
            max="80"
            step="10"
            value={minMatch}
            onChange={(e) => setMinMatch(Number(e.target.value))}
            className="w-full"
          />
          <span className="w-10 text-right font-medium text-slate-800">
            {minMatch}%
          </span>
        </label>

        <div className="flex items-center gap-3">
          <label className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
            />
            Remote only
          </label>
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            Filter
          </button>
        </div>
      </form>

      {loading && <p className="text-sm text-slate-500">Loading jobs...</p>}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && message && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">{message}</p>
          <Link
            to="/upload"
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Upload a resume
          </Link>
        </div>
      )}

      {!loading && !message && jobs.length === 0 && !error && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">
            {location
              ? `No openings in "${location}" right now.`
              : "No jobs matched those filters."}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {location
              ? "These boards are mostly remote and Europe-based, so a city filter often comes up empty."
              : "Try lowering the minimum match."}
          </p>
          {location && (
            <button
              type="button"
              onClick={() => {
                setLocation("");
                fetchJobs({ location: "" });
              }}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Clear location filter
            </button>
          )}
        </div>
      )}

      {view === "cards" && jobs.length > 0 && <JobCarousel jobs={jobs} />}

      <div className={view === "cards" ? "hidden" : "space-y-3"}>
        {jobs.map((job) => (
          <article
            key={job.id}
            className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-indigo-200 hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-slate-900">
                  {job.title}
                </h2>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <FiBriefcase className="h-3.5 w-3.5" />
                    {job.company || "—"}
                  </span>
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <FiMapPin className="h-3.5 w-3.5" />
                      {job.location}
                    </span>
                  )}
                  {job.salary && (
                    <span className="flex items-center gap-1">
                      <FiDollarSign className="h-3.5 w-3.5" />
                      {job.salary}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {job.nearby && (
                  <span
                    className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800"
                    title="Near the location on your resume"
                  >
                    Nearby
                  </span>
                )}
                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${matchColor(
                    job.match_percentage
                  )}`}
                >
                  {job.match_percentage}% match
                </span>
              </div>
            </div>

            {job.matched_skills?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {job.matched_skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-md bg-green-100 px-2 py-0.5 text-xs text-green-800"
                  >
                    {s}
                  </span>
                ))}
                {job.missing_skills?.slice(0, 5).map((s) => (
                  <span
                    key={s}
                    className="rounded-md bg-red-50 px-2 py-0.5 text-xs text-red-700"
                    title="Mentioned in this job but not found in your resume"
                  >
                    + {s}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                {job.source}
                {job.job_type ? ` · ${job.job_type}` : ""}
                {job.posted_at ? ` · ${timeAgo(job.posted_at)}` : ""}
              </p>
              <a
                href={job.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                Apply <FiExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </article>
        ))}
      </div>

      {!loading && jobs.length > 0 && (
        <p className="mt-6 text-center text-xs text-slate-400">
          {view === "cards" ? "Browsing" : "Showing"} {jobs.length} of{" "}
          {total || jobs.length} matched roles
          {meta?.cached ? " · from cache" : ""}
        </p>
      )}
    </DashboardLayout>
  );
}
