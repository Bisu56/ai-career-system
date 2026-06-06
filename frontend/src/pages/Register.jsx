import { useState, useContext } from "react";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import Brand from "../components/Brand";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const res = await api.post("/register", form);
      // Backend returns a token now, so log the user straight in.
      login(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err) {
      if (err.response?.status === 422) {
        // Laravel validation errors: { email: ["The email has already been taken."], ... }
        setErrors(err.response.data.errors || {});
      } else {
        setErrors({ general: "Something went wrong. Please try again." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (field) => errors[field]?.[0];

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <Brand />
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Create your account
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Start analyzing your resume in seconds
          </p>
        </div>

        {errors.general && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errors.general}
          </div>
        )}

        <label className="mb-1 block text-sm font-medium text-slate-700">
          Full Name
        </label>
        <input
          type="text"
          placeholder="Jane Doe"
          className={inputClass}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        {fieldError("name") && (
          <p className="mt-1 text-xs text-red-600">{fieldError("name")}</p>
        )}

        <label className="mb-1 mt-4 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          type="email"
          placeholder="you@example.com"
          className={inputClass}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        {fieldError("email") && (
          <p className="mt-1 text-xs text-red-600">{fieldError("email")}</p>
        )}

        <label className="mb-1 mt-4 block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          type="password"
          placeholder="At least 6 characters"
          className={inputClass}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        {fieldError("password") && (
          <p className="mt-1 text-xs text-red-600">{fieldError("password")}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? "Creating account..." : "Create account"}
        </button>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-indigo-600 hover:underline"
          >
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
