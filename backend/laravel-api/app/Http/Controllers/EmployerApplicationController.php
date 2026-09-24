<?php

namespace App\Http\Controllers;

use App\Models\JobApplication;
use App\Models\JobListing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class EmployerApplicationController extends Controller
{
    /** Guard: only employers may call these actions. */
    private function authorizeEmployer()
    {
        if (!auth('api')->user()?->is_employer) {
            abort(response()->json(['error' => 'Forbidden: employer access required.'], 403));
        }
    }

    /**
     * Guard that a given job belongs to the authenticated employer.
     */
    private function ownedJob(int $jobId): JobListing
    {
        return auth('api')->user()->jobListings()->findOrFail($jobId);
    }

    /**
     * GET /api/employer/jobs/{jobId}/applicants
     *
     * Returns all applicants for a specific job, ranked by ai_match_score (desc).
     * For applicants without a score yet, triggers score computation.
     */
    public function index(int $jobId)
    {
        $this->authorizeEmployer();
        $job = $this->ownedJob($jobId);

        $applications = JobApplication::where('job_listing_id', $jobId)
            ->with('user:id,name,email')
            ->orderByDesc('ai_match_score')
            ->orderBy('created_at')        // tie-break: earlier application first
            ->get();

        // Add a rank field (1-indexed, tied scores get same rank)
        $ranked  = [];
        $rank    = 1;
        $prevScore = null;
        $prevRank  = 1;
        foreach ($applications as $i => $app) {
            if ($prevScore !== null && $app->ai_match_score !== $prevScore) {
                $rank = $i + 1;
            }
            $app->rank = ($app->ai_match_score !== null) ? $rank : null;
            $prevScore = $app->ai_match_score;
            $ranked[]  = $app;
        }

        return response()->json([
            'job'          => $job->only([
                'id', 'title', 'company', 'required_skills',
                'experience_level', 'education', 'is_active',
            ]),
            'applicants'   => $ranked,
            'total'        => count($ranked),
        ]);
    }

    /**
     * POST /api/employer/jobs/{jobId}/applicants/{applicationId}/score
     *
     * Triggers AI match score computation for a single applicant.
     * Calls the FastAPI /match endpoint, persists the result, and returns it.
     */
    public function score(int $jobId, int $applicationId)
    {
        $this->authorizeEmployer();
        $job = $this->ownedJob($jobId);

        $application = JobApplication::where('id', $applicationId)
            ->where('job_listing_id', $jobId)
            ->with('user')
            ->firstOrFail();

        $scoreData = $this->computeMatchScore($application, $job);

        $application->update([
            'ai_match_score' => $scoreData['score'],
            'matched_skills' => $scoreData['matched_skills'],
            'missing_skills' => $scoreData['missing_skills'],
        ]);

        return response()->json([
            'application_id' => $application->id,
            'ai_match_score' => $application->fresh()->ai_match_score,
            'matched_skills' => $application->fresh()->matched_skills,
            'missing_skills' => $application->fresh()->missing_skills,
        ]);
    }

    /**
     * POST /api/employer/jobs/{jobId}/applicants/score-all
     *
     * Scores ALL applicants for a job that don't yet have a score (or forces a re-score).
     */
    public function scoreAll(int $jobId)
    {
        $this->authorizeEmployer();
        $job = $this->ownedJob($jobId);

        $applications = JobApplication::where('job_listing_id', $jobId)
            ->with('user')
            ->get();

        $results = [];
        foreach ($applications as $application) {
            $scoreData = $this->computeMatchScore($application, $job);
            $application->update([
                'ai_match_score' => $scoreData['score'],
                'matched_skills' => $scoreData['matched_skills'],
                'missing_skills' => $scoreData['missing_skills'],
            ]);
            $results[] = [
                'application_id' => $application->id,
                'applicant_name' => $application->user?->name,
                'ai_match_score' => $scoreData['score'],
            ];
        }

        // Sort by score desc for the response
        usort($results, fn($a, $b) => $b['ai_match_score'] <=> $a['ai_match_score']);

        return response()->json(['scored' => count($results), 'results' => $results]);
    }

    /**
     * PATCH /api/employer/jobs/{jobId}/applicants/{applicationId}/status
     *
     * Updates the application status.
     * Only the owning employer can change status; only for their own job's applicants.
     */
    public function updateStatus(Request $request, int $jobId, int $applicationId)
    {
        $this->authorizeEmployer();
        $this->ownedJob($jobId); // ensures job belongs to this employer

        $application = JobApplication::where('id', $applicationId)
            ->where('job_listing_id', $jobId)
            ->firstOrFail();

        $validated = $request->validate([
            'status' => 'required|in:applied,shortlisted,interview,selected,rejected',
        ]);

        // Don't allow updating a withdrawn application
        if ($application->status === 'withdrawn') {
            return response()->json(
                ['error' => 'Cannot update a withdrawn application.'],
                422
            );
        }

        $application->update(['status' => $validated['status']]);

        return response()->json($application->fresh()->load('user:id,name,email'));
    }

    // ─── Private Helpers ───────────────────────────────────────────────────────

    /**
     * Compute the AI match score for one application against its job.
     *
     * Strategy:
     * 1. Skill overlap (primary signal): compare applicant's known skills
     *    (extracted from their latest resume analysis) vs job's required_skills.
     * 2. Calls FastAPI /match endpoint when available for a richer score.
     * 3. Falls back to local skill-overlap calculation if AI service is down.
     */
    private function computeMatchScore(JobApplication $application, JobListing $job): array
    {
        $requiredSkills = array_map('strtolower', $job->required_skills ?? []);

        // Pull applicant's most recent resume analysis for their extracted skills
        $applicantSkills = $this->getApplicantSkills($application);

        if (empty($requiredSkills)) {
            // No required skills defined — try AI service with description as job text
            return $this->scoreViaAiService(
                $this->buildApplicantText($application, $applicantSkills),
                $job->description ?? $job->title,
                $requiredSkills,
                $applicantSkills
            );
        }

        // Try AI service first
        $aiServiceUrl = config('services.ai.url', env('AI_SERVICE_URL', 'http://127.0.0.1:8001'));
        try {
            $response = Http::timeout(10)->post("{$aiServiceUrl}/match", [
                'applicant_skills'  => $applicantSkills,
                'required_skills'   => $requiredSkills,
                'applicant_text'    => $this->buildApplicantText($application, $applicantSkills),
                'job_text'          => $this->buildJobText($job),
                'experience_level'  => $job->experience_level,
                'education'         => $job->education,
            ]);

            if ($response->ok()) {
                $data = $response->json();
                return [
                    'score'          => round($data['score'] ?? 0, 2),
                    'matched_skills' => $data['matched_skills'] ?? [],
                    'missing_skills' => $data['missing_skills'] ?? [],
                ];
            }
        } catch (\Exception $e) {
            // AI service down — fall back to local scoring
        }

        // Local fallback: skill overlap percentage
        return $this->localSkillScore($applicantSkills, $requiredSkills);
    }

    /**
     * Retrieve skills extracted from the applicant's most recent resume analysis.
     */
    private function getApplicantSkills(JobApplication $application): array
    {
        $user = $application->user;
        if (!$user) {
            return [];
        }

        // Uses the Resume model — the `skills` column stores extracted skills as JSON
        $latestResume = \App\Models\Resume::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->first();

        if ($latestResume && !empty($latestResume->skills)) {
            $skills = $latestResume->skills; // already cast to array by the model
            return array_map('strtolower', (array) $skills);
        }

        return [];
    }

    /**
     * Build a text representation of the applicant for TF-IDF matching.
     */
    private function buildApplicantText(JobApplication $application, array $skills): string
    {
        $parts = array_filter([
            $application->user?->name,
            implode(' ', $skills),
            $application->cover_letter,
        ]);
        return implode(' ', $parts);
    }

    /**
     * Build a text representation of the job for TF-IDF matching.
     */
    private function buildJobText(JobListing $job): string
    {
        $parts = array_filter([
            $job->title,
            $job->description,
            implode(' ', $job->required_skills ?? []),
            $job->experience_level,
            $job->education,
        ]);
        return implode(' ', $parts);
    }

    /**
     * Pure local skill-overlap scoring (fallback when AI service unavailable).
     * score = (matched / total_required) * 100
     */
    private function localSkillScore(array $applicantSkills, array $requiredSkills): array
    {
        if (empty($requiredSkills)) {
            return ['score' => 0.0, 'matched_skills' => [], 'missing_skills' => []];
        }

        $matched = array_values(array_intersect($requiredSkills, $applicantSkills));
        $missing = array_values(array_diff($requiredSkills, $applicantSkills));
        $score   = round((count($matched) / count($requiredSkills)) * 100, 2);

        return [
            'score'          => $score,
            'matched_skills' => $matched,
            'missing_skills' => $missing,
        ];
    }

    /**
     * Score via AI service using full text TF-IDF when no structured skills.
     */
    private function scoreViaAiService(
        string $applicantText,
        string $jobText,
        array $requiredSkills,
        array $applicantSkills
    ): array {
        $aiServiceUrl = config('services.ai.url', env('AI_SERVICE_URL', 'http://127.0.0.1:8001'));
        try {
            $response = Http::timeout(10)->post("{$aiServiceUrl}/analyze", [
                'resume' => $applicantText,
                'job'    => $jobText,
            ]);
            if ($response->ok()) {
                $data  = $response->json();
                $score = $data['match_percentage'] ?? 0;
                return [
                    'score'          => round($score, 2),
                    'matched_skills' => $data['extracted_skills'] ?? $applicantSkills,
                    'missing_skills' => $data['missing_skills'] ?? [],
                ];
            }
        } catch (\Exception $e) {
            // fall through
        }

        // Last resort: 0 score
        return ['score' => 0.0, 'matched_skills' => [], 'missing_skills' => []];
    }
}
