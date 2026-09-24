<?php

namespace App\Http\Controllers;

use App\Models\JobApplication;
use App\Models\JobListing;
use App\Services\ApplicantScorer;
use Illuminate\Http\Request;

class EmployerApplicationController extends Controller
{
    /** Guard: only employers may call these actions. */
    private function authorizeEmployer()
    {
        $user = auth('api')->user();

        if (!$user?->is_employer) {
            abort(response()->json(['error' => 'Forbidden: employer access required.'], 403));
        }

        if (!$user->isApprovedEmployer()) {
            abort(response()->json([
                'error'           => 'Your employer account is not approved.',
                'employer_status' => $user->employer_status,
            ], 403));
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
     */
    public function index(int $jobId)
    {
        $this->authorizeEmployer();
        $job = $this->ownedJob($jobId);

        $applications = JobApplication::where('job_listing_id', $jobId)
            ->with(['user:id,name,email', 'resume:' . JobApplication::RESUME_SUMMARY . ',skills,file_path'])
            ->orderByDesc('ai_match_score')
            ->orderBy('created_at')        // tie-break: earlier application first
            ->get();

        // Add a rank field (1-indexed, tied scores get same rank)
        $ranked  = [];
        $rank    = 1;
        $prevScore = null;
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
                'experience_level', 'education', 'is_active', 'moderation_status',
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
    public function score(ApplicantScorer $scorer, int $jobId, int $applicationId)
    {
        $this->authorizeEmployer();
        $this->ownedJob($jobId);

        $application = JobApplication::where('id', $applicationId)
            ->where('job_listing_id', $jobId)
            ->with(['user', 'resume', 'job'])
            ->firstOrFail();

        $scoreData = $scorer->scoreAndSave($application);

        return response()->json([
            'application_id' => $application->id,
            'ai_match_score' => $scoreData['score'],
            'matched_skills' => $scoreData['matched_skills'],
            'missing_skills' => $scoreData['missing_skills'],
        ]);
    }

    /**
     * POST /api/employer/jobs/{jobId}/applicants/score-all
     *
     * Scores ALL applicants for a job that don't yet have a score (or forces a re-score).
     */
    public function scoreAll(ApplicantScorer $scorer, int $jobId)
    {
        $this->authorizeEmployer();
        $this->ownedJob($jobId);

        $applications = JobApplication::where('job_listing_id', $jobId)
            ->with(['user', 'resume', 'job'])
            ->get();

        $results = [];
        foreach ($applications as $application) {
            $scoreData = $scorer->scoreAndSave($application);
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

        if ($validated['status'] === 'applied' && $application->status !== 'applied') {
            return response()->json(['error' => 'An application cannot be moved back to "applied".'], 422);
        }

        $application->update(['status' => $validated['status']]);

        return response()->json($application->fresh()->load('user:id,name,email'));
    }

    public function resume(int $jobId, int $applicationId)
    {
        $this->authorizeEmployer();
        $this->ownedJob($jobId);

        $application = JobApplication::where('id', $applicationId)
            ->where('job_listing_id', $jobId)
            ->with('resume')
            ->firstOrFail();

        return $application->resume?->hasFile()
            ? $application->resume->download()
            : response()->json(['error' => 'This applicant has no resume file attached.'], 404);
    }
}
