import DashboardLayout from "../layouts/DashboardLayout";
import { useState } from "react";

export default function ResumeUpload() {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold mb-6">Upload Resume</h1>

      <div className="bg-white p-8 rounded shadow w-full max-w-xl">
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileChange}
          className="mb-4"
        />

        {file && (
          <p className="text-green-600">
            Selected: {file.name}
          </p>
        )}

        <button className="mt-4 bg-blue-600 text-white p-2 rounded">
          Upload
        </button>
      </div>
    </DashboardLayout>
  );
}
