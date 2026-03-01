import { Link } from "react-router-dom";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-800 text-white p-5">
        <h2 className="text-xl font-bold mb-6">Dashboard</h2>
        <ul className="space-y-4">
          <li><Link to="/dashboard">Overview</Link></li>
          <li><Link to="/upload">Upload Resume</Link></li>
        </ul>
      </aside>

      <main className="flex-1 p-8 bg-gray-100">
        {children}
      </main>
    </div>
  );
}
