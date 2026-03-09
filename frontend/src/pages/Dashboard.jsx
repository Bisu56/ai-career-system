import DashboardLayout from "../layouts/DashboardLayout";
import { useEffect, useState } from "react";
import api from "../services/api";
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

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

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
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-gray-500 text-sm font-medium">
            Total Analyses
          </h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {stats.total_analyses}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-gray-500 text-sm font-medium">
            Average Resume Score
          </h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {stats.average_score}%
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-gray-500 text-sm font-medium">Top Career Path</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {stats.top_career}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Career Distribution</h3>
          {careerData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={careerData}
                  dataKey="count"
                  nameKey="career_prediction"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
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
            <p className="text-gray-500 text-center py-8">
              No career data yet. Upload your first resume!
            </p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4">Score History</h3>
          {scoreHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={scoreHistory}>
                <XAxis dataKey="career_prediction" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="resume_score" fill="#2563eb" name="Score" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No score history yet.
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
