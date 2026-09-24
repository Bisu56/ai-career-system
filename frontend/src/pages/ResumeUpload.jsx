import DashboardLayout from "../layouts/DashboardLayout";
import { useState } from "react";
import api from "../services/api";
import { Link } from "react-router-dom";
import { FiUploadCloud, FiBookOpen, FiCheck } from "react-icons/fi";

export default function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [job, setJob] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileError, setFileError] = useState("");
  const [uploadError, setUploadError] = useState("");

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (selected.type && selected.type !== "application/pdf") {
      setFileError("Please choose a PDF file.");
      setFile(null);
    } else if (selected.size > 2 * 1024 * 1024) {
      setFileError("File exceeds 2 MB limit. Please choose a smaller PDF.");
      setFile(null);
    } else {
      setFileError("");
      setFile(selected);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setFileError("Please choose a PDF resume first.");
      return;
    }

    setLoading(true);
    setUploadError("");
    setResult(null);
    const formData = new FormData();
    formData.append("resume", file);
    formData.append("job", job);

    try {
      const response = await api.post("/upload-resume", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.analysis_failed) {
        setUploadError(response.data.error);
      } else {
        setResult(response.data);
      }
    } catch (error) {
      const errors = error.response?.data?.errors;
      setUploadError(
        errors?.resume?.[0] ||
          errors?.job?.[0] ||
          error.response?.data?.error ||
          (error.response?.status === 429
            ? "You've analysed several resumes in a row. Please wait a minute and try again."
            : "Upload failed. Please try again.")
      );
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
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center transition hover:border-brand-400 hover:bg-brand-50/40">
            <FiUploadCloud className="h-7 w-7 text-brand-500" />
            <span className="mt-2 text-sm font-medium text-slate-700">
              {file ? file.name : "Click to choose a PDF file"}
            </span>
            <span className="mt-1 text-xs text-slate-400">PDF up to 2 MB</span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {fileError && (
            <p className="mt-2 text-xs text-red-600">{fileError}</p>
          )}
        </div>

        <div className="mb-5">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Job Description{" "}
            <span className="font-normal text-slate-400">
              (optional, paste a job posting to get a match score)
            </span>
          </label>
          <textarea
            rows={5}
            value={job}
            onChange={(e) => setJob(e.target.value)}
            maxLength={20000}
            placeholder="Paste the job description here to see how well your resume matches..."
            className="block w-full resize-y rounded-lg border border-slate-300 p-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={loading || !!fileError}
          className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Analyzing..." : "Upload & Analyze"}
        </button>

        {uploadError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {uploadError}
          </div>
        )}

        {result?.insufficient_text && (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            We could only read a little text from this PDF, so we can't predict a career reliably. If it's a scanned
            image, export your resume as a text-based PDF and upload it again.
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-6 border-t border-slate-200 pt-6">
            <div className="grid grid-cols-2 gap-4">
              {result.match_percentage > 0 && (
                <div className="rounded-xl bg-brand-50 p-4">
                  <p className="text-sm text-slate-600">Job Match</p>
                  <p className="text-2xl font-bold text-brand-600">
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
                <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-800">
                  ML: {result.ml_predicted_career ?? "Not enough text"}
                  {result.ml_predicted_career && ` (${result.career_confidence}% confidence)`}
                </span>
                <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-800">
                  Rule: {result.rule_based_career ?? "No match"}
                </span>
              </div>
              {result.top_careers?.length > 1 && (
                <div className="mt-3 space-y-2">
                  {result.top_careers.map((c) => (
                    <div key={c.career} className="flex items-center gap-3">
                      <span className="w-44 shrink-0 truncate text-xs text-slate-600">{c.career}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${c.confidence}%` }} />
                      </div>
                      <span className="w-12 text-right text-xs font-medium text-slate-700">{c.confidence}%</span>
                    </div>
                  ))}
                </div>
              )}
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
              <Section title="Suggested Job Titles">
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
                        Match: {job.score} skill{job.score !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </div>
                <Link
                  to="/jobs?tab=recommended"
                  className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline"
                >
                  See open jobs that match your skills →
                </Link>
              </Section>
            )}

            {result.recommended_courses?.length > 0 && (
              <Section title="Recommended Courses">
                <ul className="space-y-1">
                  {result.recommended_courses.map((course, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                      <FiBookOpen className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                      {course}
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
                      {q}
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
                      <FiCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
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
