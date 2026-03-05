import DashboardLayout from "../layouts/DashboardLayout";
import { useState } from "react";
import api from "../services/api";

export default function ResumeUpload() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const response = await api.post(
        "/upload-resume",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setResult(response.data);
    } catch (error) {
      console.error(error);
      const message = error.response?.data?.message || error.response?.data?.error || error.message || "Upload failed";
      alert("Upload failed: " + message);
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">
        Upload Resume
      </h1>

      <div className="bg-white p-8 rounded shadow w-full max-w-xl">
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button
          onClick={handleUpload}
          className="mt-4 bg-blue-600 text-white p-2 rounded"
        >
          Upload
        </button>

        {result && (
          <div className="mt-6">
            <p>Match: {result.match_percentage}%</p>
            <p>Score: {result.resume_score}</p>
            <p>Career: {result.predicted_career}</p>
            <p>Skills:</p>
            {result.extracted_skills.map((s) => (
              <p key={s}>{s}</p>
            ))}
            <p>Missing Skills:</p>
            {result.missing_skills.map((s) => (
              <p key={s}>{s}</p>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
