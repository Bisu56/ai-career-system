<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use Illuminate\Http\Request;
use Spatie\PdfToText\Pdf;
use Illuminate\Support\Facades\Http;
use Exception;

class ResumeController extends Controller
{
    public function upload(Request $request)
    {
        $request->validate([
            'resume' => 'required|mimes:pdf|max:2048'
        ]);

        $path = $request->file('resume')->store('resumes');
        $fullPath = storage_path('app/private/' . $path);

        try {
            $text = Pdf::getText($fullPath);
        } catch (Exception $e) {
            return response()->json(['error' => 'Failed to extract text from PDF: ' . $e->getMessage()], 422);
        }

        $jobDescription = "Looking for Python developer with SQL knowledge and data analysis skills.";

        try {
            $response = Http::timeout(30)->post('http://127.0.0.1:8001/analyze', [
                'resume' => $text,
                'job' => $jobDescription
            ]);

            $match = $response->json()['match_percentage'] ?? 0;
        } catch (Exception $e) {
            $match = 0;
        }

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
