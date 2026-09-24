<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use Illuminate\Http\Request;
use Spatie\PdfToText\Pdf;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Exception;

class ResumeController extends Controller
{
    public function upload(Request $request)
    {
        $request->validate([
            'resume' => 'required|mimes:pdf|max:2048',
            'job' => 'nullable|string|max:20000'
        ]);

        $path = $request->file('resume')->store('resumes');
        $fullPath = Storage::path($path);

        try {
            // Use an explicit pdftotext path when available so extraction works
            // even if php-fpm / artisan serve doesn't inherit /usr/local/bin on PATH.
            $binary = collect([config('services.pdftotext.path'),'/usr/local/bin/pdftotext', '/opt/homebrew/bin/pdftotext'])
                ->filter()
                ->first(fn ($p) => is_executable($p));

            $text = $binary ? Pdf::getText($fullPath, $binary) : Pdf::getText($fullPath);
        } catch (Exception $e) {
            Storage::delete($path);
            return response()->json(['error' => 'We could not read text from this PDF. Please upload a text-based PDF, not a scanned image.'], 422);
        }

        // Cast to string: empty form fields arrive as null (ConvertEmptyStringsToNull
        // middleware), but the AI service requires a string for "job".
        $jobDescription = (string) $request->input('job', '');

        $data = $this->runAnalysis($text, $jobDescription);

        if (!empty($data['analysis_failed'])) {
            Storage::delete($path);
            return response()->json($data);
        }

        $resume = Resume::create([
            'user_id' => auth('api')->id(),
            'file_path' => $path,
            'original_name' => $request->file('resume')->getClientOriginalName(),
            'extracted_text' => $text,
            'match_percentage' => $data['match_percentage'] ?? 0,
            'career_prediction' => $data['ml_predicted_career'] ?? 'Unknown',
            'resume_score' => $data['resume_score'] ?? 0,
            'skills' => $data['extracted_skills'] ?? [],
            'missing_skills' => $data['missing_skills'] ?? [],
            'analysis' => $data
        ]);

        return response()->json([
            'resume_id' => $resume->id,
            ...$data
        ]);
    }

    public function analyze(Request $request)
    {
        $request->validate([
            'resume' => 'required|string|max:200000',
            'job' => 'required|string|max:20000'
        ]);

        $resumeText = $request->input('resume');
        $jobDescription = $request->input('job');

        $data = $this->runAnalysis($resumeText, $jobDescription);

        if (auth('api')->check() && empty($data['analysis_failed'])) {
            Resume::create([
                'user_id' => auth('api')->id(),
                'file_path' => null,
                'extracted_text' => $resumeText,
                'match_percentage' => $data['match_percentage'] ?? 0,
                'career_prediction' => $data['ml_predicted_career'] ?? 'Unknown',
                'resume_score' => $data['resume_score'] ?? 0,
                'skills' => $data['extracted_skills'] ?? [],
                'missing_skills' => $data['missing_skills'] ?? [],
                'analysis' => $data
            ]);
        }

        return response()->json($data);
    }

    private function runAnalysis(string $text, string $job): array
    {
        try {
            $response = Http::timeout(60)->post(config('services.ai.url') . '/analyze', [
                'resume' => $text,
                'job' => $job
            ]);
            $data = $response->json();

            if ($response->successful() && is_array($data) && array_key_exists('resume_score', $data)) {
                return $data;
            }
        } catch (Exception $e) {
        }

        return [
            'analysis_failed' => true,
            'error' => 'The analysis service is unavailable right now. Please try again in a few minutes.',
            'match_percentage' => 0,
            'ml_predicted_career' => 'Unknown',
            'resume_score' => 0,
            'extracted_skills' => [],
            'missing_skills' => []
        ];
    }

    public function history()
    {
        $resumes = Resume::where('user_id', auth('api')->id())
            ->select('id', 'user_id', 'file_path', 'original_name', 'match_percentage', 'career_prediction', 'resume_score', 'skills', 'missing_skills', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($resumes);
    }

    private function ownedResume($id): ?Resume
    {
        return Resume::where('id', $id)
            ->where('user_id', auth('api')->id())
            ->first();
    }

    public function show($id)
    {
        $resume = $this->ownedResume($id);

        if (!$resume) {
            return response()->json(['error' => 'Resume not found'], 404);
        }

        return response()->json($resume);
    }

    public function download($id)
    {
        $resume = $this->ownedResume($id);

        if (!$resume?->hasFile()) {
            return response()->json(['error' => 'Resume file not found'], 404);
        }

        return $resume->download();
    }

    public function delete($id)
    {
        $resume = $this->ownedResume($id);

        if (!$resume) {
            return response()->json(['error' => 'Resume not found'], 404);
        }

        if ($resume->file_path) {
            Storage::delete($resume->file_path);
        }

        $resume->delete();

        return response()->json(['message' => 'Resume deleted successfully']);
    }
}
