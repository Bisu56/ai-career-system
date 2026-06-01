import DashboardLayout from "../layouts/DashboardLayout";
import { useState } from "react";
import api from "../services/api";
import { FiUploadCloud } from "react-icons/fi";

export default function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [job, setJob] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("resume", file);
    formData.append("job", job);

    try {
      const response = await api.post("/upload-resume", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setResult(response.data);
    } catch (error) {
      console.error(error);
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Upload failed";
      alert("Upload failed: " + message);
    } finally {
      setLoading(false);
    }
  };

  const Section = ({ title, children }) => (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-slate-800">{title}</h4>
      {children}
    </div>
  );

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Upload Resume
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Upload a PDF and optionally paste a job description to get a match score.
      </p>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Select PDF Resume
          </label>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40">
            <FiUploadCloud className="h-7 w-7 text-indigo-500" />
            <span className="mt-2 text-sm font-medium text-slate-700">
              {file ? file.name : "Click to choose a PDF file"}
            </span>
            <span className="mt-1 text-xs text-slate-400">PDF up to 2 MB</span>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files[0])}
              className="hidden"
            />
          </label>
        </div>

        <div className="mb-5">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Job Description{" "}
            <span className="font-normal text-slate-400">
              (optional — paste a job posting to get a match score)
            </span>
          </label>
          <textarea
            rows={5}
            value={job}
            onChange={(e) => setJob(e.target.value)}
            placeholder="Paste the job description here to see how well your resume matches..."
            className="block w-full resize-y rounded-lg border border-slate-300 p-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Analyzing..." : "Upload & Analyze"}
        </button>

        {result && (
          <div className="mt-8 space-y-6 border-t border-slate-200 pt-6">
            <div className="grid grid-cols-2 gap-4">
              {result.match_percentage > 0 && (
                <div className="rounded-xl bg-indigo-50 p-4">
                  <p className="text-sm text-slate-600">Job Match</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {result.match_percentage}%
                  </p>
                </div>
              )}
              <div className="rounded-xl bg-green-50 p-4">
                <p className="text-sm text-slate-600">Resume Score</p>
                <p className="text-2xl font-bold text-green-600">
                  {result.resume_score}%
                </p>
              </div>
            </div>

            <Section title="Predicted Career Path">
              <div className="flex flex-wrap gap-3">
                <span className="rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-800">
                  ML: {result.ml_predicted_career}
                </span>
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm font-medium text-indigo-800">
                  Rule: {result.rule_based_career}
                </span>
              </div>
            </Section>

            <Section title="Extracted Skills">
              <div className="flex flex-wrap gap-2">
                {result.extracted_skills?.map((skill, idx) => (
                  <span
                    key={idx}
                    className="rounded-md bg-green-100 px-2 py-1 text-sm text-green-800"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </Section>

            {result.missing_skills?.length > 0 && (
              <Section title="Missing Skills">
                <div className="flex flex-wrap gap-2">
                  {result.missing_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-red-100 px-2 py-1 text-sm text-red-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {result.recommended_jobs?.length > 0 && (
              <Section title="Recommended Jobs">
                <div className="space-y-2">
                  {result.recommended_jobs.slice(0, 5).map((job, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                    >
                      <span className="text-sm font-medium text-slate-800">
                        {job.title}
                      </span>
                      <span className="text-xs text-slate-500">
                        Match: {job.score} skills
                      </span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {result.recommended_courses?.length > 0 && (
              <Section title="Recommended Courses">
                <ul className="space-y-1">
                  {result.recommended_courses.map((course, idx) => (
                    <li key={idx} className="text-sm text-indigo-600">
                      📚 {course}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {result.interview_questions?.length > 0 && (
              <Section title="Interview Preparation">
                <ul className="space-y-2">
                  {result.interview_questions.slice(0, 5).map((q, idx) => (
                    <li
                      key={idx}
                      className="rounded-lg bg-amber-50 p-2 text-sm text-slate-700"
                    >
                      ❓ {q}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {result.resume_suggestions?.length > 0 && (
              <Section title="Resume Suggestions">
                <ul className="space-y-1">
                  {result.resume_suggestions.map((suggestion, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-slate-600"
                    >
                      <span className="text-green-500">✓</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
