import { useEffect, useState } from "react";
import EmployerDashboardLayout from "../../layouts/EmployerDashboardLayout";
import api from "../../services/api";
import { FiSave, FiAlertCircle, FiCheckCircle, FiLoader } from "react-icons/fi";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export default function CompanyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState("");
  const [errors, setErrors]   = useState({});

  const [form, setForm] = useState({
    company_name:  "",
    description:   "",
    location:      "",
    website:       "",
    contact_email: "",
  });

  useEffect(() => {
    api.get("/employer/profile")
      .then((res) => {
        setProfile(res.data);
        setForm({
          company_name:  res.data.company_name  ?? "",
          description:   res.data.description   ?? "",
          location:      res.data.location      ?? "",
          website:       res.data.website        ?? "",
          contact_email: res.data.contact_email ?? "",
        });
      })
      .catch((err) => {
        // 404 means no profile yet — that's fine, we'll create one
        if (err.response?.status !== 404) {
          setErrors({ general: "Failed to load company profile." });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    setSuccess("");

    try {
      let res;
      if (profile) {
        // Update existing profile
        res = await api.patch("/employer/profile", form);
      } else {
        // Create new profile
        res = await api.post("/employer/profile", form);
      }
      setProfile(res.data);
      setSuccess("Company profile saved successfully.");
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {});
      } else {
        setErrors({ general: err.response?.data?.error ?? "Failed to save profile." });
      }
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (field) => errors[field]?.[0];

  if (loading) {
    return (
      <EmployerDashboardLayout>
        <div className="flex h-64 items-center justify-center text-slate-500">
          <FiLoader className="animate-spin mr-2" /> Loading…
        </div>
      </EmployerDashboardLayout>
    );
  }

  return (
    <EmployerDashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Company Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          {profile
            ? "Update your company information visible to job seekers."
            : "Set up your company profile to start posting jobs."}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {errors.general && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <FiAlertCircle className="h-4 w-4 shrink-0" />
            {errors.general}
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <FiCheckCircle className="h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Company Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="company_name"
              value={form.company_name}
              onChange={handleChange}
              placeholder="Acme Corp"
              required
              className={inputClass}
            />
            {fieldError("company_name") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("company_name")}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">About the Company</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={4}
              placeholder="Tell applicants about your company, culture, mission…"
              className={inputClass}
            />
            {fieldError("description") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("description")}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Location</label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Kathmandu, Nepal"
              className={inputClass}
            />
            {fieldError("location") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("location")}</p>
            )}
          </div>

          {/* Website */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Website</label>
            <input
              type="url"
              name="website"
              value={form.website}
              onChange={handleChange}
              placeholder="https://acmecorp.com"
              className={inputClass}
            />
            {fieldError("website") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("website")}</p>
            )}
          </div>

          {/* Contact Email */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Contact Email</label>
            <input
              type="email"
              name="contact_email"
              value={form.contact_email}
              onChange={handleChange}
              placeholder="careers@acmecorp.com"
              className={inputClass}
            />
            {fieldError("contact_email") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("contact_email")}</p>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? (
                <><FiLoader className="animate-spin h-4 w-4" /> Saving…</>
              ) : (
                <><FiSave className="h-4 w-4" /> {profile ? "Save Changes" : "Create Profile"}</>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Profile preview */}
      {profile && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-slate-900">Profile Preview</h3>
          <div className="space-y-2">
            <p className="text-lg font-bold text-slate-900">{profile.company_name}</p>
            {profile.location && (
              <p className="text-sm text-slate-500">📍 {profile.location}</p>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-emerald-600 hover:underline"
              >
                {profile.website}
              </a>
            )}
            {profile.contact_email && (
              <p className="text-sm text-slate-500">✉ {profile.contact_email}</p>
            )}
            {profile.description && (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{profile.description}</p>
            )}
          </div>
        </div>
      )}
    </EmployerDashboardLayout>
  );
}
