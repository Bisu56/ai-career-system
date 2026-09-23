import DashboardLayout from "../../layouts/DashboardLayout";
import { useEffect, useState } from "react";
import api from "../../services/api";
import { FiUsers, FiFileText, FiBriefcase, FiTrendingUp, FiRefreshCw } from "react-icons/fi";

const STAT_CARDS = [
  { key: "total_users", label: "Total Users", icon: FiUsers, tint: "bg-indigo-50 text-indigo-600" },
  { key: "total_analyses", label: "Total Analyses", icon: FiFileText, tint: "bg-green-50 text-green-600" },
  { key: "average_score", label: "Avg Resume Score", icon: FiTrendingUp, tint: "bg-violet-50 text-violet-600", suffix: "%" },
  { key: "total_jobs", label: "Job Listings", icon: FiBriefcase, tint: "bg-amber-50 text-amber-600" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total_users: 0,
    total_analyses: 0,
    average_score: 0,
    total_jobs: 0,
  });
  const [careerDist, setCareerDist] = useState([]);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [adminRes, jobsRes] = await Promise.all([
        api.get("/admin/analytics"),
        api.get("/jobs", { params: { q: "" } }),
      ]);
      setStats({
        ...stats,
        ...adminRes.data,
        total_jobs: jobsRes.data?.total ?? jobsRes.data?.jobs?.length ?? 0,
      });
      setCareerDist(adminRes.data.career_distribution || []);
      setRecentAnalyses(adminRes.data.recent_analyses || []);
    } catch (err) {
      console.error("Failed to load admin stats", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshJobs = async () => {
    setRefreshing(true);
    try {
      await api.post("/jobs/refresh", { keyword: "python" });
      await fetchData();
    } catch (err) {
      console.error("Failed to refresh jobs", err);
      alert("Failed to refresh job listings");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
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

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">System-wide overview and controls</p>
        </div>
        <button
          onClick={handleRefreshJobs}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <FiRefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh Jobs
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, tint, suffix = "" }) => (
          <div key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{label}</span>
              <span className={`grid h-9 w-9 place-items-center rounded-lg ${tint}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 truncate text-2xl font-bold text-slate-900">
              {stats[key]}{suffix}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Career Distribution</h3>
          {careerDist.length > 0 ? (
            <div className="space-y-3">
              {careerDist.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-40 truncate text-sm font-medium text-slate-700">{item.career_prediction}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-500"
                      style={{ width: `${(item.count / Math.max(...careerDist.map(d => d.count))) * 100}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm text-slate-600">{item.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">No career data yet.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Recent Analyses</h3>
          {recentAnalyses.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentAnalyses.map((analysis) => (
                <div key={analysis.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="rounded-md bg-violet-100 px-2 py-1 text-xs font-medium text-violet-800">
                      {analysis.career_prediction}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{analysis.user?.name || "Unknown"}</p>
                      <p className="truncate text-xs text-slate-500">{analysis.user?.email || ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span>Score: <span className="font-semibold">{analysis.resume_score}%</span></span>
                    <span className="text-xs text-slate-400">
                      {new Date(analysis.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">No recent analyses.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}