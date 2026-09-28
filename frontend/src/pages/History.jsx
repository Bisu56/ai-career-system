import DashboardLayout from "../layouts/DashboardLayout";
import { Fragment, useEffect, useState } from "react";
import api from "../services/api";
import { downloadFile } from "../services/download";
import { Link } from "react-router-dom";
import { FiTrash2, FiChevronDown, FiDownload } from "react-icons/fi";

function DetailList({ title, items, tint }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <ul className="space-y-1">
        {items.map((item, idx) => (
          <li key={idx} className={`rounded-lg px-3 py-1.5 text-sm ${tint}`}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [reports, setReports] = useState({});
  const [error, setError] = useState("");

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
      setError("Failed to delete the analysis.");
    }
  };

  const handleDownload = async (item) => {
    setError("");
    try {
      await downloadFile(`/resume/${item.id}/file`, item.original_name || "resume.pdf");
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleReport = async (item) => {
    const opening = expanded !== item.id;
    setExpanded(opening ? item.id : null);
    if (!opening || item.id in reports) return;
    try {
      const res = await api.get(`/resume/${item.id}`);
      setReports((prev) => ({ ...prev, [item.id]: res.data.analysis ?? null }));
    } catch {
      setReports((prev) => ({ ...prev, [item.id]: null }));
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
        Every resume you've analyzed, newest first. Click a row to see the full report.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {history.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <p className="mb-4 text-slate-500">
            You haven't analyzed any resumes yet.
          </p>
          <Link
            to="/upload"
            className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
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
                {history.map((item) => {
                  const analysis = reports[item.id] || {};
                  const isOpen = expanded === item.id;
                  return (
                    <Fragment key={item.id}>
                      <tr
                        className="cursor-pointer transition hover:bg-slate-50"
                        onClick={() => toggleReport(item)}
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500">
                          <div className="flex items-center gap-2">
                            <FiChevronDown
                              className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                            />
                            {formatDate(item.created_at)}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className="rounded-md bg-brand-100 px-2 py-1 text-sm font-medium text-brand-800">
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
                                className="rounded bg-brand-50 px-2 py-1 text-xs text-brand-700"
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
                        <td
                          className="whitespace-nowrap px-6 py-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-3">
                            {item.file_path && (
                              <button
                                onClick={() => handleDownload(item)}
                                className="inline-flex items-center gap-1 text-sm text-slate-600 transition hover:text-slate-900"
                              >
                                <FiDownload className="h-4 w-4" /> PDF
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="inline-flex items-center gap-1 text-sm text-red-600 transition hover:text-red-800"
                            >
                              <FiTrash2 className="h-4 w-4" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-50">
                          <td colSpan={6} className="px-6 py-5">
                            {!(item.id in reports) ? (
                              <p className="text-sm text-slate-500">Loading report…</p>
                            ) : reports[item.id] === null ? (
                              <p className="text-sm text-slate-500">
                                This analysis was saved before full reports were stored. Upload the resume again to see
                                courses, interview questions and suggestions.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div className="space-y-4">
                                  {analysis.top_careers?.length > 0 && (
                                    <div>
                                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Career Fit
                                      </p>
                                      <div className="space-y-2">
                                        {analysis.top_careers.map((c) => (
                                          <div key={c.career} className="flex items-center gap-3">
                                            <span className="w-40 shrink-0 truncate text-xs text-slate-600">{c.career}</span>
                                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                                              <div className="h-full rounded-full bg-brand-500" style={{ width: `${c.confidence}%` }} />
                                            </div>
                                            <span className="w-12 text-right text-xs font-medium text-slate-700">{c.confidence}%</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {item.missing_skills?.length > 0 && (
                                    <div>
                                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Skill Gaps
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {item.missing_skills.map((s) => (
                                          <span key={s} className="rounded-md bg-red-100 px-2 py-0.5 text-xs text-red-800">
                                            {s}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <DetailList
                                    title="Recommended Courses"
                                    items={analysis.recommended_courses}
                                    tint="bg-brand-50 text-brand-800"
                                  />
                                </div>
                                <div className="space-y-4">
                                  <DetailList
                                    title="Interview Preparation"
                                    items={analysis.interview_questions?.slice(0, 5)}
                                    tint="bg-amber-50 text-slate-700"
                                  />
                                  <DetailList
                                    title="Resume Suggestions"
                                    items={analysis.resume_suggestions}
                                    tint="bg-white text-slate-600"
                                  />
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
