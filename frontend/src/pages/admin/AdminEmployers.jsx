import AdminLayout from "../../layouts/AdminLayout";
import { useEffect, useState, useCallback, useRef } from "react";
import api from "../../services/api";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import Pagination from "../../components/Pagination";
import { REVIEW_STATUS_COLORS, REVIEW_STATUS_TABS } from "../../constants/jobs";
import { formatDate } from "../../utils/format";
import {
  FiSearch,
  FiCheckCircle,
  FiXCircle,
  FiMapPin,
  FiGlobe,
  FiMail,
  FiBriefcase,
  FiAlertCircle,
  FiRefreshCw,
  FiInbox,
} from "react-icons/fi";

export default function AdminEmployers() {
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const latestRequest = useRef(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchEmployers = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/employers", { params: { status, search: debouncedSearch, page } });
      if (requestId !== latestRequest.current) return;
      setEmployers(res.data.data ?? []);
      setTotalPages(res.data.last_page || 1);
      setTotal(res.data.total ?? 0);
    } catch {
      setError("Failed to load employers.");
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [status, debouncedSearch, page]);

  useEffect(() => {
    fetchEmployers();
  }, [fetchEmployers]);

  const handleDecision = async (employer, decision) => {
    setBusyId(employer.id);
    setError("");
    setMessage("");
    try {
      const res = await api.patch(`/admin/employers/${employer.id}/${decision}`);
      setMessage(res.data.message);
      if (status && res.data.user.employer_status !== status) {
        setEmployers((prev) => prev.filter((e) => e.id !== employer.id));
        setTotal((t) => Math.max(0, t - 1));
      } else {
        setEmployers((prev) =>
          prev.map((e) => (e.id === employer.id ? { ...e, employer_status: res.data.user.employer_status } : e))
        );
      }
    } catch (err) {
      setError(err.response?.data?.error ?? "Action failed. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Approve Employers</h1>
      <p className="mt-1 text-sm text-slate-500">
        New employer accounts cannot post jobs until an admin approves them.
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {REVIEW_STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => { setStatus(t.value); setPage(1); }}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                status === t.value ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
              }`}
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
            placeholder="Search name, email or company..."
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
        ) : employers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <FiInbox className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-slate-500">
              {status === "pending" ? "No employers waiting for approval." : "No employers found."}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-slate-500">{total} employer{total !== 1 ? "s" : ""}</p>
            <div className="space-y-4">
              {employers.map((employer) => {
                const profile = employer.company_profile;
                return (
                  <div
                    key={employer.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900">
                            {profile?.company_name ?? "No company profile yet"}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                              REVIEW_STATUS_COLORS[employer.employer_status] ?? "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {employer.employer_status}
                          </span>
                          {!employer.is_active && (
                            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600">
                              Deactivated
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {employer.name} · {employer.email}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                          {profile?.location && (
                            <span className="inline-flex items-center gap-1">
                              <FiMapPin className="h-3.5 w-3.5" /> {profile.location}
                            </span>
                          )}
                          {profile?.website && (
                            <a
                              href={profile.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-brand-600 hover:underline"
                            >
                              <FiGlobe className="h-3.5 w-3.5" /> {profile.website}
                            </a>
                          )}
                          {profile?.contact_email && (
                            <span className="inline-flex items-center gap-1">
                              <FiMail className="h-3.5 w-3.5" /> {profile.contact_email}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <FiBriefcase className="h-3.5 w-3.5" /> {employer.job_listings_count ?? 0} jobs posted
                          </span>
                          <span>Registered {formatDate(employer.created_at)}</span>
                        </div>
                        {profile?.description && (
                          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                            {profile.description}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 gap-2">
                        {employer.employer_status !== "approved" && (
                          <button
                            onClick={() => handleDecision(employer, "approve")}
                            disabled={busyId === employer.id}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                          >
                            <FiCheckCircle className="h-4 w-4" /> Approve
                          </button>
                        )}
                        {employer.employer_status !== "rejected" && (
                          <button
                            onClick={() => handleDecision(employer, "reject")}
                            disabled={busyId === employer.id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            <FiXCircle className="h-4 w-4" /> Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </AdminLayout>
  );
}
