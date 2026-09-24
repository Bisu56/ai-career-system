import { Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/authContextValue";
import { homePathFor } from "../routes/homePath";

export default function NotFound() {
  const { user } = useContext(AuthContext);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-start px-5 py-24">
      <p className="text-sm font-medium text-brand-600">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">This page doesn't exist.</h1>
      <p className="mt-3 text-slate-600">The link may be broken, or the page may have moved.</p>
      <Link
        to={user ? homePathFor(user) : "/"}
        className="mt-8 rounded-lg bg-ink px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
      >
        {user ? "Back to dashboard" : "Back to home"}
      </Link>
    </div>
  );
}
