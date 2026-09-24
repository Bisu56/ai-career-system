<?php

namespace App\Http\Controllers;

use App\Models\JobApplication;
use App\Models\JobListing;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;

class ApplicationController extends Controller
{
    /**
     * Apply for a job.
     * Guards: job must be active, no duplicate applications.
     */
    public function apply(Request $request, int $jobId)
    {
        $user = auth('api')->user();

        if ($user->is_employer || $user->is_admin) {
            return response()->json(['error' => 'Only job seeker accounts can apply for jobs.'], 403);
        }

        $job = JobListing::where('id', $jobId)
            ->where('moderation_status', 'approved')
            ->employerInGoodStanding()
            ->first();

        if (!$job) {
            return response()->json(['error' => 'Job not found.'], 404);
        }

        if (!$job->is_active) {
            return response()->json(['error' => 'This job is no longer accepting applications.'], 422);
        }

        if (!$job->acceptsApplications()) {
            return response()->json(['error' => 'This listing comes from an external job board. Please apply on the original posting.'], 422);
        }

        if ($job->deadlinePassed()) {
            return response()->json(['error' => 'The application deadline for this job has passed.'], 422);
        }

        $existing = JobApplication::where('user_id', $user->id)
            ->where('job_listing_id', $jobId)
            ->first();

        if ($existing) {
            return response()->json(['error' => 'You have already applied for this job.'], 409);
        }

        $request->validate([
            'cover_letter' => 'nullable|string|max:5000',
        ]);

        try {
            $application = JobApplication::create([
                'user_id'        => $user->id,
                'job_listing_id' => $jobId,
                'resume_id'      => ($user->latestUploadedResume ?? $user->latestResume)?->id,
                'status'         => 'applied',
                'cover_letter'   => $request->input('cover_letter'),
            ]);
        } catch (UniqueConstraintViolationException $e) {
            return response()->json(['error' => 'You have already applied for this job.'], 409);
        }

        return response()->json($application->load('job'), 201);
    }

    /**
     * List the current user's applications with job details.
     */
    public function index()
    {
        $applications = JobApplication::where('user_id', auth('api')->id())
            ->with(['job', 'resume:' . JobApplication::RESUME_SUMMARY])
            ->orderByDesc('created_at')
            ->get();

        return response()->json($applications);
    }

    /**
     * Show a single application (must belong to the current user).
     */
    public function show(int $id)
    {
        $application = JobApplication::where('id', $id)
            ->where('user_id', auth('api')->id())
            ->with(['job', 'resume:' . JobApplication::RESUME_SUMMARY])
            ->firstOrFail();

        return response()->json($application);
    }

    /**
     * Withdraw an application (sets status to "withdrawn").
     * Only the owning user may withdraw; only possible from applied/shortlisted/interview.
     */
    public function withdraw(int $id)
    {
        $application = JobApplication::where('id', $id)
            ->where('user_id', auth('api')->id())
            ->firstOrFail();

        if (in_array($application->status, ['selected', 'rejected', 'withdrawn'])) {
            return response()->json(['error' => 'Application cannot be withdrawn at this stage.'], 422);
        }

        $application->update(['status' => 'withdrawn']);

        return response()->json($application->load('job'));
    }

    /**
     * Quick summary: counts per status, for the dashboard widget.
     */
    public function summary()
    {
        $userId = auth('api')->id();

        $counts = JobApplication::where('user_id', $userId)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $total = JobApplication::where('user_id', $userId)->count();

        return response()->json([
            'total'  => $total,
            'counts' => $counts,
        ]);
    }
}
