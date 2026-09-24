import AdminLayout from "../../layouts/AdminLayout";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { formatDateTime } from "../../utils/format";
import {
  FiRefreshCw,
  FiDatabase,
  FiAlertCircle,
  FiCheckCircle,
  FiInfo,
  FiArrowRight,
} from "react-icons/fi";

const SOURCE_LABELS = {
  wwr: "We Work Remotely",
  remoteok: "Remote OK",
  adzuna: "Adzuna",
};


export default function AdminFeed() {
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("python");
  const [limit, setLimit] = useState(50);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const fetchFeed = async () => {
    try {
      const res = await api.get("/admin/feed");
      setFeed(res.data);
    } catch {
      setError("Failed to load feed status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleRefresh = async (e) => {
    e.preventDefault();
    setRefreshing(true);
    setError("");
    setResult(null);
    try {
      const res = await api.post("/admin/jobs/refresh", {
        keyword: keyword.trim() || "python",
        limit: Math.min(100, Math.max(1, Number(limit) || 50)),
      });
      setResult(res.data);
      await fetchFeed();
    } catch (err) {
      setError(err.response?.data?.error ?? "Failed to refresh the job feed.");
    } finally {
      setRefreshing(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">External Job Feed</h1>
      <p className="mt-1 text-sm text-slate-500">
        Pull live remote jobs from public sources into the job board. Imported jobs are approved automatically.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Refresh Feed</h3>
          <form onSubmit={handleRefresh} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Keyword</label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. python, react, data"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Limit per source</label>
              <input
                type="number"
                min={1}
                max={100}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
              >
                <FiRefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Fetching jobs…" : "Refresh Now"}
              </button>
            </div>
          </form>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <FiAlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          {result && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Imported or updated <strong>{result.imported}</strong> jobs for "{result.keyword}"
                {result.skipped > 0 ? `, skipped ${result.skipped}` : ""}. The board now holds{" "}
                <strong>{result.total_external}</strong> external jobs.
              </span>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">External Jobs</span>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <FiDatabase className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {loading ? "…" : feed?.total_external ?? 0}
          </p>
          <Link
            to="/admin/jobs?status=approved&source=external"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
          >
            View external jobs <FiArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-semibold text-slate-900">Sources</h3>
        </div>
        {loading ? (
          <p className="px-6 py-8 text-sm text-slate-500">Loading…</p>
        ) : (feed?.sources ?? []).length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-slate-500">
            No external jobs imported yet. Run a refresh to pull the first batch.
          </p>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3">Source</th>
                <th className="px-6 py-3">Jobs</th>
                <th className="px-6 py-3">Last Imported</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {feed.sources.map((row) => (
                <tr key={row.source} className="transition hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm font-medium text-slate-900">
                    {SOURCE_LABELS[row.source] ?? row.source}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-700">{row.count}</td>
                  <td className="px-6 py-3 text-sm text-slate-500">{formatDateTime(row.last_imported)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {feed && !feed.adzuna_enabled && (
        <div className="mt-5 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <FiInfo className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <span>
            Adzuna is not connected. Set ADZUNA_APP_ID and ADZUNA_APP_KEY for the AI service and the Laravel API to include it.
            We Work Remotely and Remote OK need no keys.
          </span>
        </div>
      )}
    </AdminLayout>
  );
}
