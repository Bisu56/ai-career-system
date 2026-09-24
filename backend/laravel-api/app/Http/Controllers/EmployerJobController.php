<?php

namespace App\Http\Controllers;

use App\Models\JobListing;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EmployerJobController extends Controller
{
    /** Guard: only approved employers may call these actions. */
    private function authorizeEmployer()
    {
        $user = auth('api')->user();

        if (!$user?->is_employer) {
            abort(response()->json(['error' => 'Forbidden: employer access required.'], 403));
        }

        if ($user->employer_status === 'pending') {
            abort(response()->json([
                'error'           => 'Your employer account is pending admin approval.',
                'employer_status' => 'pending',
            ], 403));
        }

        if ($user->employer_status === 'rejected') {
            abort(response()->json([
                'error'           => 'Your employer account has been rejected.',
                'employer_status' => 'rejected',
            ], 403));
        }
    }

    /**
     * GET /api/employer/jobs
     * Returns all jobs posted by the authenticated employer.
     */
    public function index(Request $request)
    {
        $this->authorizeEmployer();

        $status = $request->get('status'); // 'active' | 'closed' | null (all)
        $query  = auth('api')->user()->jobListings();

        if ($status === 'active') {
            $query->where('is_active', true);
        } elseif ($status === 'closed') {
            $query->where('is_active', false);
        }

        $jobs = $query->withCount('applications')
                      ->orderByDesc('created_at')
                      ->get();

        return response()->json($jobs);
    }

    /**
     * GET /api/employer/jobs/{id}
     */
    public function show(int $id)
    {
        $this->authorizeEmployer();

        $job = auth('api')->user()->jobListings()
                          ->withCount('applications')
                          ->findOrFail($id);

        return response()->json($job);
    }

    /**
     * POST /api/employer/jobs
     * New jobs start with moderation_status=pending — admin must approve before visible.
     */
    public function store(Request $request)
    {
        $this->authorizeEmployer();

        $user = auth('api')->user();

        $validated = $request->validate([
            'title'                => 'required|string|max:255',
            'description'          => 'required|string|max:10000',
            'location'             => 'nullable|string|max:255',
            'required_skills'      => 'nullable|array',
            'required_skills.*'    => 'string|max:100',
            'experience_level'     => 'nullable|in:entry,junior,mid,senior,lead',
            'education'            => 'nullable|string|max:255',
            'employment_type'      => 'nullable|in:full-time,part-time,contract,internship,remote',
            'salary_range'         => 'nullable|string|max:100',
            'application_deadline' => 'nullable|date|after_or_equal:today',
        ]);

        $companyName = $user->companyProfile?->company_name ?? $user->name;

        $job = JobListing::create(array_merge($validated, [
            'employer_id'       => $user->id,
            'company'           => $companyName,
            'source'            => 'employer',
            'external_id'       => 'emp-' . $user->id . '-' . Str::uuid(),
            'url'               => config('app.url', 'http://localhost:8000'),
            'is_active'         => true,
            'posted_at'         => now(),
            'moderation_status' => 'pending', // waits for admin approval
        ]));

        return response()->json($job->loadCount('applications'), 201);
    }

    /**
     * PATCH /api/employer/jobs/{id}
     * When employer edits a previously-approved job, reset to pending moderation.
     */
    public function update(Request $request, int $id)
    {
        $this->authorizeEmployer();

        $job = auth('api')->user()->jobListings()->findOrFail($id);

        $validated = $request->validate([
            'title'                => 'sometimes|string|max:255',
            'description'          => 'sometimes|string|max:10000',
            'location'             => 'sometimes|nullable|string|max:255',
            'required_skills'      => 'sometimes|nullable|array',
            'required_skills.*'    => 'string|max:100',
            'experience_level'     => 'sometimes|nullable|in:entry,junior,mid,senior,lead',
            'education'            => 'sometimes|nullable|string|max:255',
            'employment_type'      => 'sometimes|nullable|in:full-time,part-time,contract,internship,remote',
            'salary_range'         => 'sometimes|nullable|string|max:100',
            'application_deadline' => 'sometimes|nullable|date',
            'is_active'            => 'sometimes|boolean',
        ]);

        // Content edits on an approved job push it back to pending
        $contentFields = ['title', 'description', 'required_skills', 'experience_level', 'education'];
        $hasContentEdit = !empty(array_intersect(array_keys($validated), $contentFields));
        if ($hasContentEdit && $job->moderation_status === 'approved') {
            $validated['moderation_status'] = 'pending';
        }

        $job->update($validated);

        return response()->json($job->fresh()->loadCount('applications'));
    }

    /**
     * PATCH /api/employer/jobs/{id}/close
     */
    public function close(int $id)
    {
        $this->authorizeEmployer();

        $job = auth('api')->user()->jobListings()->findOrFail($id);

        if (!$job->is_active) {
            return response()->json(['message' => 'Job is already closed.', 'job' => $job], 200);
        }

        $job->update(['is_active' => false]);

        return response()->json(['message' => 'Job closed successfully.', 'job' => $job->fresh()]);
    }

    /**
     * DELETE /api/employer/jobs/{id}
     */
    public function destroy(int $id)
    {
        $this->authorizeEmployer();

        $job = auth('api')->user()->jobListings()->findOrFail($id);
        $job->delete();

        return response()->json(['deleted' => true]);
    }
}
