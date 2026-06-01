import DashboardLayout from "../layouts/DashboardLayout";
import { useEffect, useState } from "react";
import api from "../services/api";
import { FiFileText, FiBarChart2, FiBriefcase } from "react-icons/fi";
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
  const [careerData, setCareerData] = useState([]);
  const [scoreHistory, setScoreHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, careerRes, historyRes] = await Promise.all([
        api.get("/analytics"),
        api.get("/analytics/career-distribution"),
        api.get("/analytics/score-history"),
      ]);

      setStats(statsRes.data);
      setCareerData(careerRes.data);
      setScoreHistory(historyRes.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
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

  const cards = [
    {
      label: "Total Analyses",
      value: stats.total_analyses,
      icon: FiFileText,
      tint: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Average Resume Score",
      value: `${stats.average_score}%`,
      icon: FiBarChart2,
      tint: "bg-green-50 text-green-600",
    },
    {
      label: "Top Career Path",
      value: stats.top_career,
      icon: FiBriefcase,
      tint: "bg-violet-50 text-violet-600",
    },
  ];

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Dashboard
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        An overview of your resume analyses.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, tint }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">
                {label}
              </span>
              <span className={`grid h-9 w-9 place-items-center rounded-lg ${tint}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-3 truncate text-2xl font-bold text-slate-900">
              {value}
            </p>
          </div>
        ))}
      </div>

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
                  {careerData.map((entry, index) => (
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
              No career data yet. Upload your first resume!
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
    </DashboardLayout>
  );
}
