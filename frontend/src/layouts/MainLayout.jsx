import { Link } from "react-router-dom";

export default function MainLayout({ children }) {
  return (
    <div>
      <nav className="bg-blue-600 text-white p-4 flex justify-between">
        <h1 className="font-bold text-lg">AI Career System</h1>
        <div className="space-x-4">
          <Link to="/">Home</Link>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>
      </nav>

      <div>{children}</div>
    </div>
  );
}
