import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../context/authContextValue";

export default function EmployerProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-500">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!user.is_employer) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}
