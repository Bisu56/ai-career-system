<?php

namespace App\Http\Controllers;

use App\Models\JobListing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class JobController extends Controller
{
    public function search(Request $request)
    {
        $q = $request->get('q', '');
        $query = JobListing::query();

        if ($q !== '') {
            $query->where(function ($qb) use ($q) {
                $qb->where('title', 'LIKE', "%{$q}%")
                   ->orWhere('company', 'LIKE', "%{$q}%")
                   ->orWhere('location', 'LIKE', "%{$q}%");
            });
        }

        // Count before applying the display limit so callers can show accurate totals
        $total = (clone $query)->count();

        $jobs = $query->latest('posted_at')->limit(50)->get();

        // Tag which ones the current user has saved
        $savedIds = auth('api')->user()
            ->savedJobs()->pluck('job_listing_id')->flip();

        $jobsWithSaved = $jobs->map(fn ($j) => array_merge($j->toArray(), [
            'saved' => $savedIds->has($j->id),
        ]));

        // Return {total, jobs} so dashboards can display the real count
        // even when the result set is capped at 50.
        return response()->json([
            'total' => $total,
            'jobs'  => $jobsWithSaved,
        ]);
    }

    public function refresh(Request $request)
    {
        if (!auth('api')->user()?->is_admin) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $keyword = $request->get('keyword', 'python');

        $response = Http::timeout(30)->get(
            config('services.ai.url') . '/jobs/feed',
            ['keyword' => $keyword, 'limit' => 100]
        );

        if (!$response->ok()) {
            return response()->json(['error' => 'AI service unavailable'], 502);
        }

        $imported = 0;
        foreach ($response->json('jobs', []) as $job) {
            JobListing::updateOrCreate(
                ['external_id' => $job['external_id']],
                [
                    'source'    => $job['source'],
                    'title'     => $job['title'],
                    'company'   => $job['company'],
                    'url'       => $job['url'],
                    'location'  => $job['location'] ?? null,
                    'posted_at' => $job['posted_at'] ?? null,
                ]
            );
            $imported++;
        }

        return response()->json(['imported' => $imported]);
    }

    public function save(Request $request, int $id)
    {
        $job = JobListing::findOrFail($id);
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
        $jobs = auth('api')->user()->savedJobs()->latest('saved_jobs.created_at')->get();
        return response()->json($jobs->map(fn ($j) => array_merge($j->toArray(), ['saved' => true])));
    }

    /**
     * Show a single job with whether the current user has saved/applied to it.
     */
    public function show(int $id)
    {
        $job = JobListing::findOrFail($id);

        $user = auth('api')->user();
        $saved   = $user->savedJobs()->where('job_listing_id', $id)->exists();
        $applied = $user->applications()->where('job_listing_id', $id)->exists();

        return response()->json(array_merge($job->toArray(), [
            'saved'   => $saved,
            'applied' => $applied,
        ]));
    }
}
