<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use Illuminate\Http\Request;
use Spatie\PdfToText\Pdf;
use Illuminate\Support\Facades\Http;

class ResumeController extends Controller
{
    public function upload(Request $request)
    {
        // 1️⃣ Validate file
        $request->validate([
            'resume' => 'required|mimes:pdf|max:2048'
        ]);

        // 2️⃣ Store file
        $path = $request->file('resume')->store('resumes');

        $fullPath = storage_path('app/' . $path);

        // 3️⃣ Extract text from PDF
        $text = Pdf::getText($fullPath);

        // 4️⃣ Send to Python AI Service
        $jobDescription = "Looking for Python developer with SQL knowledge and data analysis skills.";

        $response = Http::post('http://127.0.0.1:8001/analyze', [
            'resume' => $text,
            'job' => $jobDescription
        ]);

        $match = $response->json()['match_percentage'] ?? 0;

        // 5️⃣ Save in database
        $resume = Resume::create([
            'user_id' => auth('api')->id(),
            'file_path' => $path,
            'extracted_text' => $text,
            'match_percentage' => $match
        ]);

        return response()->json([
            'message' => 'Resume uploaded successfully',
            'match_percentage' => $match
        ]);
    }
}
