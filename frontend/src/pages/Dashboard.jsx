import DashboardLayout from "../layouts/DashboardLayout";

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
    </DashboardLayout>
  );
}
