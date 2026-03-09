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

        $jobDescription = $request->input('job', '');

        try {
            $response = Http::timeout(30)->post('http://127.0.0.1:8001/analyze', [
                'resume' => $text,
                'job' => $jobDescription
            ]);

            $data = $response->json();
        } catch (Exception $e) {
            $data = [
                'match_percentage' => 0,
                'ml_predicted_career' => 'Unknown',
                'resume_score' => 0,
                'extracted_skills' => [],
                'missing_skills' => []
            ];
        }

        $resume = Resume::create([
            'user_id' => auth('api')->id(),
            'file_path' => $path,
            'extracted_text' => $text,
            'match_percentage' => $data['match_percentage'] ?? 0,
            'career_prediction' => $data['ml_predicted_career'] ?? 'Unknown',
            'resume_score' => $data['resume_score'] ?? 0,
            'skills' => $data['extracted_skills'] ?? [],
            'missing_skills' => $data['missing_skills'] ?? []
        ]);

        return response()->json([
            'resume_id' => $resume->id,
            ...$data
        ]);
    }

    public function analyze(Request $request)
    {
        $request->validate([
            'resume' => 'required|string',
            'job' => 'required|string'
        ]);

        $resumeText = $request->input('resume');
        $jobDescription = $request->input('job');

        try {
            $response = Http::timeout(30)->post('http://127.0.0.1:8001/analyze', [
                'resume' => $resumeText,
                'job' => $jobDescription
            ]);

            $data = $response->json();
        } catch (Exception $e) {
            $data = [
                'match_percentage' => 0,
                'ml_predicted_career' => 'Unknown',
                'resume_score' => 0,
                'extracted_skills' => [],
                'missing_skills' => []
            ];
        }

        if (auth('api')->check()) {
            Resume::create([
                'user_id' => auth('api')->id(),
                'file_path' => null,
                'extracted_text' => $resumeText,
                'match_percentage' => $data['match_percentage'] ?? 0,
                'career_prediction' => $data['ml_predicted_career'] ?? 'Unknown',
                'resume_score' => $data['resume_score'] ?? 0,
                'skills' => $data['extracted_skills'] ?? [],
                'missing_skills' => $data['missing_skills'] ?? []
            ]);
        }

        return response()->json($data);
    }

    public function history()
    {
        $resumes = Resume::where('user_id', auth('api')->id())
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($resumes);
    }

    public function delete($id)
    {
        $resume = Resume::where('id', $id)
            ->where('user_id', auth('api')->id())
            ->first();

        if (!$resume) {
            return response()->json(['error' => 'Resume not found'], 404);
        }

        $resume->delete();

        return response()->json(['message' => 'Resume deleted successfully']);
    }
}
