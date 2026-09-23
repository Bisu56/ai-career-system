import DashboardLayout from "../../layouts/DashboardLayout";
import { useEffect, useState } from "react";
import api from "../../services/api";
import { FiSearch, FiTrash2, FiUserCheck, FiUserX, FiEdit2 } from "react-icons/fi";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 10;
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/users", {
        params: { page, per_page: perPage, search },
      });
      setUsers(res.data.data || res.data);
      setTotalPages(res.data.last_page || 1);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(users.filter((u) => u.id !== id));
    } catch (err) {
      console.error("Delete failed", err);
      alert("Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleAdmin = async (user) => {
    setTogglingId(user.id);
    try {
      await api.patch(`/admin/users/${user.id}`, { is_admin: !user.is_admin });
      setUsers(users.map((u) => (u.id === user.id ? { ...u, is_admin: !u.is_admin } : u)));
    } catch (err) {
      console.error("Toggle admin failed", err);
      alert("Failed to update user role");
    } finally {
      setTogglingId(null);
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

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
      <p className="mt-1 text-sm text-slate-500">Manage user accounts and admin privileges</p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <div className="relative max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-3">User</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Joined</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="transition hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{user.name}</p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                      {user.email}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <button
                        onClick={() => handleToggleAdmin(user)}
                        disabled={togglingId === user.id}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                          user.is_admin
                            ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {user.is_admin ? (
                          <>
                            <FiUserCheck className="h-3 w-3" /> Admin
                          </>
                        ) : (
                          <>
                            <FiUserX className="h-3 w-3" /> User
                          </>
                        )}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(user.id, user.name)}
                        disabled={deletingId === user.id}
                        className="inline-flex items-center gap-1 text-sm text-red-600 transition hover:text-red-800 disabled:opacity-50"
                      >
                        <FiTrash2 className="h-4 w-4" /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
            <p className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}