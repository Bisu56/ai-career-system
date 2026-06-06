import DashboardLayout from "../layouts/DashboardLayout";
import { useEffect, useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";
import { FiTrash2 } from "react-icons/fi";

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const response = await api.get("/resume/history");
      setHistory(response.data);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this analysis?")) return;

    try {
      await api.delete(`/resume/${id}`);
      setHistory(history.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Failed to delete");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const scoreColor = (score) =>
    score >= 70
      ? "text-green-600"
      : score >= 40
      ? "text-amber-600"
      : "text-red-600";

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
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Analysis History
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Every resume you've analyzed, newest first.
      </p>

      {history.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="mb-4 text-slate-500">
            You haven't analyzed any resumes yet.
          </p>
          <Link
            to="/upload"
            className="inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Upload Your First Resume
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Career Prediction</th>
                  <th className="px-6 py-3">Score</th>
                  <th className="px-6 py-3">Match %</th>
                  <th className="px-6 py-3">Skills</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => (
                  <tr key={item.id} className="transition hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="rounded-md bg-violet-100 px-2 py-1 text-sm font-medium text-violet-800">
                        {item.career_prediction}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`font-semibold ${scoreColor(item.resume_score)}`}>
                        {item.resume_score}%
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-600">
                      {item.match_percentage}%
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(item.skills || []).slice(0, 4).map((skill, idx) => (
                          <span
                            key={idx}
                            className="rounded bg-indigo-50 px-2 py-1 text-xs text-indigo-700"
                          >
                            {skill}
                          </span>
                        ))}
                        {(item.skills || []).length > 4 && (
                          <span className="text-xs text-slate-400">
                            +{item.skills.length - 4} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="inline-flex items-center gap-1 text-sm text-red-600 transition hover:text-red-800"
                      >
                        <FiTrash2 className="h-4 w-4" /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
