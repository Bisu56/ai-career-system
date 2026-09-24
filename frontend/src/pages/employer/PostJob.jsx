import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import EmployerDashboardLayout from "../../layouts/EmployerDashboardLayout";
import api from "../../services/api";
import { FiSave, FiAlertCircle, FiX, FiPlus, FiLoader } from "react-icons/fi";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

const EMPTY_FORM = {
  title: "",
  description: "",
  location: "",
  required_skills: [],
  experience_level: "",
  education: "",
  employment_type: "",
  salary_range: "",
  application_deadline: "",
  is_active: true,
};

export default function PostJob() {
  const { id } = useParams(); // present when editing
  const isEdit  = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm]       = useState(EMPTY_FORM);
  const [skillInput, setSkillInput] = useState("");
  const [loading, setLoading] = useState(isEdit); // fetch existing job if editing
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState({});

  // Load job for editing
  useEffect(() => {
    if (!isEdit) return;
    api.get(`/employer/jobs/${id}`)
      .then((res) => {
        const j = res.data;
        setForm({
          title:                j.title             ?? "",
          description:          j.description       ?? "",
          location:             j.location          ?? "",
          required_skills:      j.required_skills   ?? [],
          experience_level:     j.experience_level  ?? "",
          education:            j.education         ?? "",
          employment_type:      j.employment_type   ?? "",
          salary_range:         j.salary_range      ?? "",
          application_deadline: j.application_deadline
            ? j.application_deadline.substring(0, 10)
            : "",
          is_active: j.is_active ?? true,
        });
      })
      .catch(() => setErrors({ general: "Failed to load job." }))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const addSkill = () => {
    const s = skillInput.trim().toLowerCase();
    if (s && !form.required_skills.includes(s)) {
      setForm((prev) => ({ ...prev, required_skills: [...prev.required_skills, s] }));
    }
    setSkillInput("");
  };

  const removeSkill = (skill) =>
    setForm((prev) => ({
      ...prev,
      required_skills: prev.required_skills.filter((s) => s !== skill),
    }));

  const handleSkillKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors({});

    const payload = {
      ...form,
      application_deadline: form.application_deadline || null,
    };

    try {
      if (isEdit) {
        await api.patch(`/employer/jobs/${id}`, payload);
      } else {
        await api.post("/employer/jobs", payload);
      }
      navigate("/employer/jobs");
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {});
      } else {
        setErrors({ general: err.response?.data?.error ?? "Failed to save job." });
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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {isEdit ? "Edit Job" : "Post a New Job"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isEdit
            ? "Update the job details. Changes are saved immediately."
            : "Fill in the details for the position you want to advertise."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {errors.general && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <FiAlertCircle className="h-4 w-4 shrink-0" /> {errors.general}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Job Title */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Senior Backend Developer"
              required
              className={inputClass}
            />
            {fieldError("title") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("title")}</p>
            )}
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Job Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={6}
              placeholder="Describe the role, responsibilities, and what you're looking for…"
              required
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
              placeholder="Kathmandu, Nepal / Remote"
              className={inputClass}
            />
          </div>

          {/* Employment Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Employment Type</label>
            <select name="employment_type" value={form.employment_type} onChange={handleChange} className={inputClass}>
              <option value="">— Select —</option>
              <option value="full-time">Full-Time</option>
              <option value="part-time">Part-Time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
              <option value="remote">Remote</option>
            </select>
          </div>

          {/* Experience Level */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Experience Level</label>
            <select name="experience_level" value={form.experience_level} onChange={handleChange} className={inputClass}>
              <option value="">— Select —</option>
              <option value="entry">Entry Level</option>
              <option value="junior">Junior</option>
              <option value="mid">Mid Level</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead / Manager</option>
            </select>
          </div>

          {/* Education */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Education Requirement</label>
            <input
              type="text"
              name="education"
              value={form.education}
              onChange={handleChange}
              placeholder="e.g. Bachelor's in Computer Science"
              className={inputClass}
            />
          </div>

          {/* Salary Range */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Salary Range</label>
            <input
              type="text"
              name="salary_range"
              value={form.salary_range}
              onChange={handleChange}
              placeholder="e.g. NPR 50,000 – 80,000 / month"
              className={inputClass}
            />
          </div>

          {/* Application Deadline */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Application Deadline</label>
            <input
              type="date"
              name="application_deadline"
              value={form.application_deadline}
              onChange={handleChange}
              className={inputClass}
            />
            {fieldError("application_deadline") && (
              <p className="mt-1 text-xs text-red-600">{fieldError("application_deadline")}</p>
            )}
          </div>

          {/* Required Skills */}
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Required Skills</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                placeholder="Type a skill and press Enter or comma…"
                className={inputClass}
              />
              <button
                type="button"
                onClick={addSkill}
                className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 transition"
              >
                <FiPlus className="h-4 w-4" /> Add
              </button>
            </div>
            {form.required_skills.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.required_skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-0.5 rounded hover:text-red-600"
                    >
                      <FiX className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Is Active (edit only) */}
          {isEdit && (
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Job is accepting applications
              </label>
              <p className="mt-1 text-xs text-slate-400">
                Uncheck to close the job — no new applications will be accepted.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3 border-t border-slate-100 pt-5">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? (
              <><FiLoader className="animate-spin h-4 w-4" /> Saving…</>
            ) : (
              <><FiSave className="h-4 w-4" /> {isEdit ? "Save Changes" : "Post Job"}</>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate("/employer/jobs")}
            className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </EmployerDashboardLayout>
  );
}
