import { useRef, useState } from "react";
import {
  FiBriefcase,
  FiMapPin,
  FiDollarSign,
  FiExternalLink,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

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

/**
 * Shows one job at a time with prev/next arrows. Also responds to the left and
 * right arrow keys and to a horizontal swipe, so it works the same on a phone.
 */
export default function JobCarousel({ jobs = [] }) {
  const [index, setIndex] = useState(0);
  // Which way the incoming card should slide in from.
  const [direction, setDirection] = useState(1);
  const touchStartX = useRef(null);
  const containerRef = useRef(null);

  const count = jobs.length;

  // A new/filtered job list is a different deck - start at the top of it.
  // Adjusting during render (rather than in an effect) avoids showing one
  // frame of the old position.
  const [seenJobs, setSeenJobs] = useState(jobs);
  if (seenJobs !== jobs) {
    setSeenJobs(jobs);
    setIndex(0);
  }

  const go = (step) => {
    if (count === 0) return;
    setDirection(step);
    setIndex((i) => (i + step + count) % count);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    }
  };

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    // Ignore taps and tiny drags; only a deliberate swipe should move the deck.
    if (Math.abs(delta) > 50) go(delta < 0 ? 1 : -1);
  };

  if (count === 0) return null;

  const job = jobs[index];

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="group"
      aria-roledescription="carousel"
      aria-label="Matched job openings"
      className="rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-indigo-200"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous job"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
        >
          <FiChevronLeft className="h-5 w-5" />
        </button>

        <article
          // Re-keying on the index restarts the slide-in animation each move.
          key={job.id ?? index}
          className={`min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${
            direction >= 0 ? "animate-job-in-right" : "animate-job-in-left"
          }`}
          aria-live="polite"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900">
                {job.title}
              </h3>
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

          {(job.matched_skills?.length > 0 ||
            job.missing_skills?.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {job.matched_skills?.map((s) => (
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

          <div className="mt-4 flex items-center justify-between gap-3">
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

        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next job"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
        >
          <FiChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2">
        {/* Past ~12 jobs a dot per job becomes a smudge, so show the count. */}
        {count <= 12 ? (
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {jobs.map((j, i) => (
              <button
                key={j.id ?? i}
                type="button"
                aria-label={`Go to job ${i + 1}`}
                aria-current={i === index}
                onClick={() => {
                  setDirection(i >= index ? 1 : -1);
                  setIndex(i);
                }}
                className={`h-2 rounded-full transition-all ${
                  i === index
                    ? "w-5 bg-indigo-600"
                    : "w-2 bg-slate-300 hover:bg-slate-400"
                }`}
              />
            ))}
          </div>
        ) : null}
        <p className="text-xs text-slate-400">
          Job {index + 1} of {count} · use the arrows, arrow keys, or swipe
        </p>
      </div>
    </div>
  );
}
