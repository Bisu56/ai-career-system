import DashboardLayout from "../layouts/DashboardLayout";
import { useState } from "react";
import api from "../services/api";

export default function ResumeUpload() {
  const [file, setFile] = useState(null);
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

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Upload Resume</h1>

      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-2xl">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select PDF Resume
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files[0])}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <button
          onClick={handleUpload}
          disabled={loading}
          className={`w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition ${
            loading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {loading ? "Analyzing..." : "Upload & Analyze"}
        </button>

        {result && (
          <div className="mt-8 space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">
                Analysis Results
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Match Percentage</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {result.match_percentage}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Resume Score</p>
                  <p className="text-2xl font-bold text-green-600">
                    {result.resume_score}%
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">
                Predicted Career Path
              </h4>
              <div className="flex gap-3">
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                  ML: {result.ml_predicted_career}
                </span>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  Rule: {result.rule_based_career}
                </span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">
                Extracted Skills
              </h4>
              <div className="flex flex-wrap gap-2">
                {result.extracted_skills?.map((skill, idx) => (
                  <span
                    key={idx}
                    className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {result.missing_skills?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">
                  Missing Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.missing_skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.recommended_jobs?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">
                  Recommended Jobs
                </h4>
                <div className="space-y-2">
                  {result.recommended_jobs.slice(0, 5).map((job, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-gray-50 p-2 rounded"
                    >
                      <span className="font-medium">{job.title}</span>
                      <span className="text-sm text-gray-500">
                        Match: {job.score} skills
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.recommended_courses?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">
                  Recommended Courses
                </h4>
                <ul className="space-y-1">
                  {result.recommended_courses.map((course, idx) => (
                    <li key={idx} className="text-blue-600 text-sm">
                      📚 {course}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.interview_questions?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">
                  Interview Preparation
                </h4>
                <ul className="space-y-2">
                  {result.interview_questions.slice(0, 5).map((q, idx) => (
                    <li
                      key={idx}
                      className="bg-yellow-50 p-2 rounded text-sm text-gray-700"
                    >
                      ❓ {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.resume_suggestions?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">
                  Resume Suggestions
                </h4>
                <ul className="space-y-1">
                  {result.resume_suggestions.map((suggestion, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-gray-600 flex items-start gap-2"
                    >
                      <span className="text-green-500">✓</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
