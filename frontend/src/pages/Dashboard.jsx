import DashboardLayout from "../layouts/DashboardLayout";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { APP_STATUS_COLORS } from "../constants/jobs";
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


export default function Dashboard() {
  const [stats, setStats] = useState({
    total_analyses: 0,
    average_score: 0,
    top_career: "N/A",
  });
  const [careerData, setCareerData]     = useState([]);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [appSummary, setAppSummary]     = useState({ total: 0, counts: {} });
  const [recommended, setRecommended]   = useState({ based_on: null, jobs: [] });
  const [loading, setLoading]           = useState(true);
  const [loadError, setLoadError]       = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const results = await Promise.allSettled([
        api.get("/analytics"),
        api.get("/analytics/career-distribution"),
        api.get("/analytics/score-history"),
        api.get("/applications/summary"),
        api.get("/jobs/recommended"),
      ]);
      const [statsRes, careerRes, historyRes, appRes, recRes] = results.map((r) =>
        r.status === "fulfilled" ? r.value.data : null
      );

      if (statsRes) setStats(statsRes);
      if (careerRes) setCareerData(careerRes);
      if (historyRes) setScoreHistory(historyRes);
      if (appRes) setAppSummary(appRes);
      if (recRes) setRecommended(recRes);
      if (results.some((r) => r.status === "rejected")) {
        setLoadError("Some of your dashboard data could not be loaded. Refresh the page to try again.");
      }
      setLoading(false);
    };

    fetchData();
  }, []);

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
      tint: "bg-brand-50 text-brand-600",
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
      tint: "bg-brand-50 text-brand-600",
      to: "/upload",
    },
    {
      label: "Saved Jobs",
      value: stats.saved_jobs ?? 0,
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

      {loadError && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</div>
      )}

      {/* Stat cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map(({ label, value, icon: Icon, tint, to }) => (
          <Link
            key={label}
            to={to}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-brand-200 hover:shadow-md transition"
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
              className="text-sm text-brand-600 hover:underline"
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

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Recommended Jobs For You
            </h3>
            {recommended.based_on && (
              <p className="mt-0.5 text-xs text-slate-500">
                Based on your latest analysis ({recommended.based_on.career})
              </p>
            )}
          </div>
          <Link
            to="/jobs?tab=recommended"
            className="text-sm text-brand-600 hover:underline"
          >
            See all →
          </Link>
        </div>
        {!recommended.based_on ? (
          <p className="py-6 text-center text-sm text-slate-500">
            <Link to="/upload" className="text-brand-600 hover:underline">
              Upload a resume
            </Link>{" "}
            to get job recommendations matched to your skills.
          </p>
        ) : recommended.jobs.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No open jobs match your skills yet. Check back soon.
          </p>
        ) : (
          <div className="space-y-2">
            {recommended.jobs.slice(0, 5).map((job) => (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-4 py-3 transition hover:bg-brand-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{job.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    {job.company}
                    {job.matched_skills?.length > 0 && ` · ${job.matched_skills.join(", ")}`}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700">
                  {job.recommendation_score}% match
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

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
              <Link to="/upload" className="text-brand-600 hover:underline">
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
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition"
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
