import { useState, useContext } from "react";
import api from "../services/api";
import { AuthContext } from "../context/authContextValue";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import Brand from "../components/Brand";
import { homePathFor } from "../routes/homePath";
import { FiBriefcase, FiUser } from "react-icons/fi";

export default function Register() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    is_employer: searchParams.get("as") === "employer",
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
      login(res.data.token, res.data.user);
      // Redirect to the right dashboard based on role
      navigate(homePathFor(res.data.user));
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      } else if (err.response?.status === 429) {
        setErrors({ general: "Too many attempts. Please wait a minute and try again." });
      } else {
        setErrors({ general: "Something went wrong. Please try again." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (field) => errors[field]?.[0];

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

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
            Start your career journey
          </p>
        </div>

        {errors.general && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errors.general}
          </div>
        )}

        {/* Role selection */}
        <p className="mb-2 text-sm font-medium text-slate-700">I am a…</p>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setForm({ ...form, is_employer: false })}
            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-sm font-medium transition ${
              !form.is_employer
                ? "border-brand-600 bg-brand-50 text-brand-700"
                : "border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            <FiUser className="h-5 w-5" />
            Job Seeker
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, is_employer: true })}
            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 text-sm font-medium transition ${
              form.is_employer
                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                : "border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            <FiBriefcase className="h-5 w-5" />
            Employer
          </button>
        </div>

        <label className="mb-1 block text-sm font-medium text-slate-700">
          Full Name
        </label>
        <input
          type="text"
          placeholder={form.is_employer ? "Your name" : "Jane Doe"}
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
          placeholder="Min 8 chars, 1 uppercase, 1 number"
          className={inputClass}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        {fieldError("password") && (
          <p className="mt-1 text-xs text-red-600">{fieldError("password")}</p>
        )}

        <label className="mb-1 mt-4 block text-sm font-medium text-slate-700">
          Confirm Password
        </label>
        <input
          type="password"
          placeholder="Repeat your password"
          className={inputClass}
          value={form.password_confirmation}
          onChange={(e) =>
            setForm({ ...form, password_confirmation: e.target.value })
          }
          required
        />

        <button
          type="submit"
          disabled={submitting}
          className={`mt-6 w-full rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-60 ${
            form.is_employer
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-brand-600 hover:bg-brand-700"
          }`}
        >
          {submitting
            ? "Creating account…"
            : form.is_employer
            ? "Create Employer Account"
            : "Create Account"}
        </button>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-brand-600 hover:underline"
          >
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
