<?php

namespace App\Http\Controllers;

use App\Models\JobListing;
use App\Services\ApplicantScorer;
use Illuminate\Http\Request;

class JobController extends Controller
{
    public function search(Request $request)
    {
        $filters = $request->validate([
            'q'                => 'nullable|string|max:200',
            'location'         => 'nullable|string|max:200',
            'source'           => 'nullable|in:employer,external',
            'employment_type'  => 'nullable|in:full-time,part-time,contract,internship,remote',
            'experience_level' => 'nullable|in:entry,junior,mid,senior,lead',
            'page'             => 'nullable|integer|min:1',
        ]);
        $q    = trim($filters['q'] ?? '');
        $user = auth('api')->user();

        // Admins see all jobs; everyone else sees only approved+active
        $query = JobListing::query();
        if (!$user?->is_admin) {
            $query->visibleToSeekers();
        }

        if ($q !== '') {
            $query->where(function ($qb) use ($q) {
                $qb->whereContains(['title', 'company', 'location', 'description'], $q);
                $skill = trim(preg_replace('/["\[\],]/', '', $q));
                if ($skill !== '') {
                    $qb->orWhereRaw("required_skills LIKE ? ESCAPE '\\'", ['%"' . addcslashes(strtolower($skill), '\\%_') . '"%']);
                }
            });
        }

        $query->fromSource($filters['source'] ?? null);

        foreach (['employment_type', 'experience_level'] as $filter) {
            if (!empty($filters[$filter])) {
                $query->where($filter, $filters[$filter]);
            }
        }

        if (!empty($filters['location'])) {
            $query->whereContains(['location'], trim($filters['location']));
        }

        $perPage = 20;
        $page    = (int) ($filters['page'] ?? 1);
        $total   = (clone $query)->count();
        $jobs    = $query->latest('posted_at')->latest('id')->forPage($page, $perPage)->get();

        $savedIds   = $user->savedJobs()->pluck('job_listing_id')->flip();
        $appliedIds = $user->applications()->pluck('job_listing_id')->flip();

        $jobsWithSaved = $jobs->map(fn ($j) => array_merge($j->toArray(), [
            'saved'   => $savedIds->has($j->id),
            'applied' => $appliedIds->has($j->id),
        ]));

        return response()->json([
            'total'     => $total,
            'page'      => $page,
            'last_page' => max(1, (int) ceil($total / $perPage)),
            'jobs'      => $jobsWithSaved,
        ]);
    }

    public function recommended()
    {
        $user   = auth('api')->user();
        $resume = $user->latestResume;

        if (!$resume || empty($resume->skills)) {
            return response()->json(['based_on' => null, 'jobs' => []]);
        }

        $skills  = array_map('strtolower', (array) $resume->skills);
        $career  = strtolower((string) $resume->career_prediction);
        $applied = $user->applications()->pluck('job_listing_id')->flip();
        $saved   = $user->savedJobs()->pluck('job_listing_id')->flip();

        $jobs = JobListing::visibleToSeekers()
            ->select('id', 'source', 'title', 'company', 'location', 'url', 'description', 'skills', 'required_skills', 'employment_type', 'posted_at')
            ->latest('posted_at')
            ->limit(500)
            ->get()
            ->map(fn ($job) => ['job' => $job, 'match' => $this->matchJob($job, $skills, $career)])
            ->filter(fn ($row) => $row['match']['recommendation_score'] > 0)
            ->sortByDesc(fn ($row) => $row['match']['recommendation_score'])
            ->take(10)
            ->map(fn ($row) => array_merge($row['job']->makeHidden('description')->toArray(), $row['match'], [
                'saved'   => $saved->has($row['job']->id),
                'applied' => $applied->has($row['job']->id),
            ]))
            ->values();

        return response()->json([
            'based_on' => [
                'resume_id' => $resume->id,
                'career'    => $resume->career_prediction,
                'skills'    => $resume->skills,
            ],
            'jobs' => $jobs,
        ]);
    }

    private function matchJob(JobListing $job, array $skills, string $career): array
    {
        $required = array_map('strtolower', $job->required_skills ?: ($job->skills ?: []));
        $text     = strtolower($job->title . ' ' . $job->description);

        if (!empty($required)) {
            ['score' => $score, 'matched_skills' => $matched] = ApplicantScorer::overlap($required, $skills);
        } else {
            $matched = array_values(array_filter($skills, fn ($s) => preg_match('/(?<![a-z0-9])' . preg_quote($s, '/') . '(?![a-z0-9])/', $text)));
            $score   = min(100, count($matched) * 25);
        }

        if ($career !== '' && $career !== 'unknown' && str_contains(strtolower($job->title), $career)) {
            $score = min(100, $score + 20);
        }

        return [
            'recommendation_score' => round($score, 1),
            'matched_skills'       => $matched,
        ];
    }

    public function save(Request $request, int $id)
    {
        $job = JobListing::visibleToSeekers()->findOrFail($id);
        auth('api')->user()->savedJobs()->syncWithoutDetaching([$job->id]);
        return response()->json(['saved' => true]);
    }

    public function unsave(Request $request, int $id)
    {
        auth('api')->user()->savedJobs()->detach($id);
        return response()->json(['saved' => false]);
    }

    public function saved()
    {
        $jobs = auth('api')->user()->savedJobs()->visibleToSeekers()->latest('saved_jobs.created_at')->get();
        return response()->json($jobs->map(fn ($j) => array_merge($j->toArray(), ['saved' => true])));
    }

    public function show(int $id)
    {
        $job  = JobListing::with('employer.companyProfile')->findOrFail($id);
        $user = auth('api')->user();

        $application = $user->applications()->where('job_listing_id', $id)->first();
        $saved       = $user->savedJobs()->where('job_listing_id', $id)->exists();
        $visible     = JobListing::visibleToSeekers()->whereKey($id)->exists();

        if (!$visible && !$user->is_admin && !$application && $job->employer_id !== $user->id) {
            return response()->json(['error' => 'Job not found.'], 404);
        }

        $company = $job->employer?->companyProfile;
        $data    = $job->toArray();
        unset($data['employer']);

        return response()->json(array_merge($data, [
            'saved'           => $saved,
            'applied'         => (bool) $application,
            'application'     => $application,
            'company_profile' => $company?->only(['company_name', 'description', 'location', 'website', 'contact_email']),
            'deadline_passed' => $job->deadlinePassed(),
            'latest_resume'   => $user->latestResume?->only(['id', 'original_name', 'career_prediction', 'skills']),
        ]));
    }
}
