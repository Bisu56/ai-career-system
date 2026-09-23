<?php

namespace App\Http\Controllers;

use App\Models\JobApplication;
use App\Models\JobListing;
use Illuminate\Http\Request;

class ApplicationController extends Controller
{
    /**
     * Apply for a job.
     * Guards: job must be active, no duplicate applications.
     */
    public function apply(Request $request, int $jobId)
    {
        $job = JobListing::findOrFail($jobId);

        if (!$job->is_active) {
            return response()->json(['error' => 'This job is no longer accepting applications.'], 422);
        }

        $user = auth('api')->user();

        $existing = JobApplication::where('user_id', $user->id)
            ->where('job_listing_id', $jobId)
            ->first();

        if ($existing) {
            return response()->json(['error' => 'You have already applied for this job.'], 409);
        }

        $request->validate([
            'cover_letter' => 'nullable|string|max:5000',
        ]);

        $application = JobApplication::create([
            'user_id'        => $user->id,
            'job_listing_id' => $jobId,
            'status'         => 'applied',
            'cover_letter'   => $request->input('cover_letter'),
        ]);

        return response()->json($application->load('job'), 201);
    }

    /**
     * List the current user's applications with job details.
     */
    public function index()
    {
        $applications = JobApplication::where('user_id', auth('api')->id())
            ->with('job')
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
            ->with('job')
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
