import { useState, useContext } from "react";
import api from "../services/api";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

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

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form
        onSubmit={handleRegister}
        className="bg-white p-8 rounded shadow-md w-96"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Register</h2>

        {errors.general && (
          <div className="mb-4 p-2 text-sm text-red-700 bg-red-100 rounded">
            {errors.general}
          </div>
        )}

        <input
          type="text"
          placeholder="Full Name"
          className="w-full mb-1 p-2 border rounded"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        {fieldError("name") && (
          <p className="mb-3 text-xs text-red-600">{fieldError("name")}</p>
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full mt-3 mb-1 p-2 border rounded"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        {fieldError("email") && (
          <p className="mb-3 text-xs text-red-600">{fieldError("email")}</p>
        )}

        <input
          type="password"
          placeholder="Password (min 6 characters)"
          className="w-full mt-3 mb-1 p-2 border rounded"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        {fieldError("password") && (
          <p className="mb-3 text-xs text-red-600">{fieldError("password")}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full mt-4 bg-blue-600 text-white p-2 rounded disabled:opacity-60"
        >
          {submitting ? "Creating account..." : "Register"}
        </button>

        <p className="mt-4 text-sm text-center text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
