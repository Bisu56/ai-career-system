import AdminLayout from "../../layouts/AdminLayout";
import { useEffect, useState, useCallback, useRef } from "react";
import api from "../../services/api";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import Pagination from "../../components/Pagination";
import { REVIEW_STATUS_COLORS } from "../../constants/jobs";
import { formatDate } from "../../utils/format";
import {
  FiSearch,
  FiTrash2,
  FiShield,
  FiUserCheck,
  FiUserX,
  FiAlertCircle,
  FiRefreshCw,
} from "react-icons/fi";

const ROLE_TABS = [
  { label: "All", value: "" },
  { label: "Job Seekers", value: "seeker" },
  { label: "Employers", value: "employer" },
  { label: "Admins", value: "admin" },
];

const STATUS_TABS = [
  { label: "All", value: "" },
  { label: "Active", value: "active" },
  { label: "Deactivated", value: "inactive" },
];

function RoleBadge({ user }) {
  if (user.is_admin) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
        <FiShield className="h-3 w-3" /> Admin
      </span>
    );
  }
  if (user.is_employer) {
    return (
      <div className="flex flex-wrap items-center gap-1">
        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          Employer
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
            REVIEW_STATUS_COLORS[user.employer_status] ?? "bg-slate-100 text-slate-600"
          }`}
        >
          {user.employer_status}
        </span>
      </div>
    );
  }
  return (
    <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
      Job Seeker
    </span>
  );
}

function StatusBadge({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Deactivated
    </span>
  );
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim());
  const latestRequest = useRef(0);
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const perPage = 10;

  const fetchUsers = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/users", {
        params: { page, per_page: perPage, search: debouncedSearch, role, status },
      });
      if (requestId !== latestRequest.current) return;
      setUsers(res.data.data ?? []);
      setTotalPages(res.data.last_page || 1);
      setTotal(res.data.total ?? 0);
    } catch {
      setError("Failed to load users.");
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [page, debouncedSearch, role, status]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const runAction = async (user, request, successMessage, onSuccess) => {
    setBusyId(user.id);
    setError("");
    setMessage("");
    try {
      const res = await request();
      if (onSuccess) {
        onSuccess(res);
      } else {
        const updated = res.data.user ?? res.data;
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
      }
      setMessage(res.data.message ?? successMessage);
    } catch (err) {
      setError(err.response?.data?.error ?? "Action failed. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleAdmin = (user) =>
    runAction(
      user,
      () => api.patch(`/admin/users/${user.id}`, { is_admin: !user.is_admin }),
      user.is_admin ? `Admin rights removed from "${user.name}".` : `"${user.name}" is now an admin.`
    );

  const handleToggleActive = (user) =>
    runAction(user, () =>
      api.patch(`/admin/users/${user.id}/${user.is_active ? "deactivate" : "activate"}`)
    );

  const handleDelete = (user) => {
    if (!confirm(`Delete user "${user.name}"? This cannot be undone.`)) return;
    runAction(
      user,
      () => api.delete(`/admin/users/${user.id}`),
      `User "${user.name}" deleted.`,
      () => {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        setTotal((t) => Math.max(0, t - 1));
      }
    );
  };

  const tabClass = (active) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
      active ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manage Users</h1>
      <p className="mt-1 text-sm text-slate-500">
        Search accounts, change roles, and activate or deactivate users.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {ROLE_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => { setRole(t.value); setPage(1); }}
              className={tabClass(role === t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => { setStatus(t.value); setPage(1); }}
              className={tabClass(status === t.value)}
            >
              {t.label}
            </button>
          ))}
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

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-4">
          <div className="relative w-full max-w-md">
            <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or email..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <p className="shrink-0 text-sm text-slate-500">{total} users</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Activity</th>
                <th className="px-6 py-3">Joined</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                    <FiRefreshCw className="mr-2 inline h-4 w-4 animate-spin" /> Loading…
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="transition hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                      {user.company_profile?.company_name && (
                        <p className="text-xs text-emerald-600">{user.company_profile.company_name}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge user={user} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusBadge active={user.is_active} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                      {user.is_employer
                        ? `${user.job_listings_count ?? 0} jobs posted`
                        : `${user.applications_count ?? 0} applications`}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleAdmin(user)}
                          disabled={busyId === user.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
                        >
                          <FiShield className="h-3.5 w-3.5" />
                          {user.is_admin ? "Remove Admin" : "Make Admin"}
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={busyId === user.id}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                            user.is_active
                              ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                              : "border-green-200 text-green-700 hover:bg-green-50"
                          }`}
                        >
                          {user.is_active ? (
                            <><FiUserX className="h-3.5 w-3.5" /> Deactivate</>
                          ) : (
                            <><FiUserCheck className="h-3.5 w-3.5" /> Activate</>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={busyId === user.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <FiTrash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={totalPages} onChange={setPage} className="border-t border-slate-200 px-4 py-3" />
      </div>
    </AdminLayout>
  );
}
