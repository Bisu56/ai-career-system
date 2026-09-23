import DashboardLayout from "../layouts/DashboardLayout";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import {
  FiFileText,
  FiBarChart2,
  FiBriefcase,
  FiBookmark,
  FiCheckCircle,
  FiLoader,
} from "react-icons/fi";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#22c55e", "#f59e0b", "#ec4899"];

const APP_STATUS_COLORS = {
  applied:     "bg-blue-100 text-blue-700",
  shortlisted: "bg-yellow-100 text-yellow-700",
  interview:   "bg-violet-100 text-violet-700",
  selected:    "bg-green-100 text-green-700",
  rejected:    "bg-red-100 text-red-600",
  withdrawn:   "bg-slate-100 text-slate-600",
};

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_analyses: 0,
    average_score: 0,
    top_career: "N/A",
  });
  const [careerData, setCareerData]     = useState([]);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [savedCount, setSavedCount]     = useState(0);
  const [appSummary, setAppSummary]     = useState({ total: 0, counts: {} });
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, careerRes, historyRes, savedRes, appRes] =
        await Promise.all([
          api.get("/analytics"),
          api.get("/analytics/career-distribution"),
          api.get("/analytics/score-history"),
          api.get("/jobs/saved"),
          api.get("/applications/summary"),
        ]);

      setStats(statsRes.data);
      setCareerData(careerRes.data);
      setScoreHistory(historyRes.data);
      setSavedCount(Array.isArray(savedRes.data) ? savedRes.data.length : 0);
      setAppSummary(appRes.data);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
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

  const statCards = [
    {
      label: "Total Analyses",
      value: stats.total_analyses,
      icon: FiFileText,
      tint: "bg-indigo-50 text-indigo-600",
      to: "/history",
    },
    {
      label: "Average Resume Score",
      value: `${stats.average_score}%`,
      icon: FiBarChart2,
      tint: "bg-green-50 text-green-600",
      to: "/history",
    },
    {
      label: "Top Career Path",
      value: stats.top_career,
      icon: FiBriefcase,
      tint: "bg-violet-50 text-violet-600",
      to: "/upload",
    },
    {
      label: "Saved Jobs",
      value: savedCount,
      icon: FiBookmark,
      tint: "bg-amber-50 text-amber-600",
      to: "/jobs",
    },
    {
      label: "Total Applications",
      value: appSummary.total,
      icon: FiCheckCircle,
      tint: "bg-teal-50 text-teal-600",
      to: "/applications",
    },
  ];

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Dashboard
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        An overview of your resume analyses, saved jobs, and applications.
      </p>

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map(({ label, value, icon: Icon, tint, to }) => (
          <Link
            key={label}
            to={to}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-200 hover:shadow-md transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{label}</span>
              <span className={`grid h-9 w-9 place-items-center rounded-lg ${tint}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 truncate text-2xl font-bold text-slate-900">
              {value}
            </p>
          </Link>
        ))}
      </div>

      {/* Application status breakdown */}
      {appSummary.total > 0 && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">
              Application Status Breakdown
            </h3>
            <Link
              to="/applications"
              className="text-sm text-indigo-600 hover:underline"
            >
              View all →
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(appSummary.counts).map(([status, count]) => (
              <Link
                key={status}
                to="/applications"
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition hover:opacity-80 ${
                  APP_STATUS_COLORS[status] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
                <span className="font-bold">{count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-slate-900">
            Career Distribution
          </h3>
          {careerData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={careerData}
                  dataKey="count"
                  nameKey="career_prediction"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  label
                >
                  {careerData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">
              No career data yet.{" "}
              <Link to="/upload" className="text-indigo-600 hover:underline">
                Upload your first resume!
              </Link>
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-slate-900">
            Score History
          </h3>
          {scoreHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={scoreHistory}>
                <XAxis
                  dataKey="career_prediction"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
                <Tooltip />
                <Bar
                  dataKey="resume_score"
                  fill="#6366f1"
                  name="Score"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">
              No score history yet.
            </p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-slate-900">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/upload"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            Upload Resume
          </Link>
          <Link
            to="/jobs"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Browse Jobs
          </Link>
          <Link
            to="/applications"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            My Applications
          </Link>
          <Link
            to="/history"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Analysis History
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
