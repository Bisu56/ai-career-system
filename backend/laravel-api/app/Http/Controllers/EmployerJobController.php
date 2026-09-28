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

        $validated = $this->normalizeSkills($request->validate($this->rules(false)));

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

        $validated = $this->normalizeSkills($request->validate($this->rules(true)));

        $deadline = $validated['application_deadline'] ?? null;
        $currentDeadline = $job->application_deadline ? substr((string) $job->application_deadline, 0, 10) : null;
        if ($deadline && $deadline !== $currentDeadline && $deadline < JobListing::localToday()) {
            return response()->json([
                'message' => 'The application deadline cannot be in the past.',
                'errors'  => ['application_deadline' => ['The application deadline cannot be in the past.']],
            ], 422);
        }

        $job->fill($validated);

        // Content edits on an approved job push it back to pending
        $contentFields = ['title', 'description', 'location', 'required_skills', 'experience_level', 'education', 'employment_type', 'salary_range'];
        if ($job->isDirty($contentFields) && in_array($job->moderation_status, ['approved', 'rejected'])) {
            $job->moderation_status = 'pending';
        }

        $job->save();

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

        $job = auth('api')->user()->jobListings()->withCount('applications')->findOrFail($id);

        if ($job->applications_count > 0) {
            return response()->json([
                'error' => 'This job has applicants, so it cannot be deleted. Close it instead to keep their application history.',
            ], 422);
        }

        $job->delete();

        return response()->json(['deleted' => true]);
    }

    private function rules(bool $updating): array
    {
        $required = $updating ? 'sometimes|required' : 'required';
        $optional = $updating ? 'sometimes|nullable' : 'nullable';

        return array_filter([
            'title'                => "{$required}|string|max:255",
            'description'          => "{$required}|string|max:10000",
            'location'             => "{$optional}|string|max:255",
            'required_skills'      => "{$optional}|array|list|max:30",
            'required_skills.*'    => 'required|string|max:100',
            'experience_level'     => "{$optional}|in:entry,junior,mid,senior,lead",
            'education'            => "{$optional}|string|max:255",
            'employment_type'      => "{$optional}|in:full-time,part-time,contract,internship,remote",
            'salary_range'         => "{$optional}|string|max:100",
            'application_deadline' => $updating
                ? 'sometimes|nullable|date_format:Y-m-d'
                : 'nullable|date_format:Y-m-d|after_or_equal:' . JobListing::localToday(),
            'is_active'            => $updating ? 'sometimes|boolean' : null,
        ]);
    }

    private function normalizeSkills(array $validated): array
    {
        if (array_key_exists('required_skills', $validated) && $validated['required_skills'] !== null) {
            $validated['required_skills'] = array_values(array_unique(array_filter(
                array_map(fn ($skill) => strtolower(trim($skill)), $validated['required_skills'])
            )));
        }

        return $validated;
    }
}
