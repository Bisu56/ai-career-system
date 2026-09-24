<?php

namespace App\Http\Controllers;

use App\Models\JobListing;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class EmployerJobController extends Controller
{
    /** Guard: only employers may call these actions. */
    private function authorizeEmployer()
    {
        if (!auth('api')->user()?->is_employer) {
            abort(response()->json(['error' => 'Forbidden: employer access required.'], 403));
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
     * Returns a single job owned by the authenticated employer.
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
     * Creates a new job listing for the authenticated employer.
     * Jobs are created as active and use the employer's company name.
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

        // Derive company name from profile, or fall back to user's name
        $companyName = $user->companyProfile?->company_name ?? $user->name;

        $job = JobListing::create(array_merge($validated, [
            'employer_id' => $user->id,
            'company'     => $companyName,
            'source'      => 'employer',
            'external_id' => 'emp-' . $user->id . '-' . Str::uuid(),
            'url'         => config('app.url', 'http://localhost:8000'),
            'is_active'   => true,
            'posted_at'   => now(),
        ]));

        return response()->json($job->loadCount('applications'), 201);
    }

    /**
     * PATCH /api/employer/jobs/{id}
     * Updates a job listing — only the owning employer may update.
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

        $job->update($validated);

        return response()->json($job->fresh()->loadCount('applications'));
    }

    /**
     * PATCH /api/employer/jobs/{id}/close
     * Closes a job listing — no further applications will be accepted.
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
     * Permanently deletes the job (and cascade-deletes applications).
     * Only allowed if the job belongs to the authenticated employer.
     */
    public function destroy(int $id)
    {
        $this->authorizeEmployer();

        $job = auth('api')->user()->jobListings()->findOrFail($id);
        $job->delete();

        return response()->json(['deleted' => true]);
    }
}
