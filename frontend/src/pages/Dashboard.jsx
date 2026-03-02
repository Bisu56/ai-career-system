import DashboardLayout from "../layouts/DashboardLayout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const data = [
  { name: "Python", score: 80 },
  { name: "JavaScript", score: 70 },
  { name: "SQL", score: 60 },
];

export default function Dashboard() {
  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Overview</h1>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-lg font-semibold">Resume Score</h3>
          <p className="text-2xl mt-4">--%</p>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-lg font-semibold">Job Matches</h3>
          <p className="text-2xl mt-4">--</p>
        </div>

        <div className="bg-white p-6 rounded shadow">
          <h3 className="text-lg font-semibold">Skill Gaps</h3>
          <p className="text-2xl mt-4">--</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded shadow mt-8">
        <h3 className="text-lg font-semibold mb-4">
          Skill Strength
        </h3>
        <BarChart width={400} height={300} data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="score" fill="#2563eb" />
        </BarChart>
      </div>
    </DashboardLayout>
  );
}
