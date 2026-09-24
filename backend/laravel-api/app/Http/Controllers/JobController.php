<?php

namespace App\Http\Controllers;

use App\Models\JobListing;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class JobController extends Controller
{
    public function search(Request $request)
    {
        $q    = $request->get('q', '');
        $user = auth('api')->user();

        // Admins see all jobs; everyone else sees only approved+active
        $query = JobListing::query();
        if (!$user?->is_admin) {
            $query->visibleToSeekers();
        }

        if ($q !== '') {
            $query->where(function ($qb) use ($q) {
                $qb->where('title',    'LIKE', "%{$q}%")
                   ->orWhere('company',  'LIKE', "%{$q}%")
                   ->orWhere('location', 'LIKE', "%{$q}%");
            });
        }

        $total = (clone $query)->count();
        $jobs  = $query->latest('posted_at')->limit(50)->get();

        $savedIds = $user->savedJobs()->pluck('job_listing_id')->flip();

        $jobsWithSaved = $jobs->map(fn ($j) => array_merge($j->toArray(), [
            'saved' => $savedIds->has($j->id),
        ]));

        return response()->json(['total' => $total, 'jobs' => $jobsWithSaved]);
    }

    public function refresh(Request $request)
    {
        if (!auth('api')->user()?->is_admin) {
            return response()->json(['error' => 'Forbidden'], 403);
        }
        $keyword  = $request->get('keyword', 'python');
        $response = Http::timeout(30)->get(config('services.ai.url') . '/jobs/feed', ['keyword' => $keyword, 'limit' => 100]);
        if (!$response->ok()) {
            return response()->json(['error' => 'AI service unavailable'], 502);
        }
        $imported = 0;
        foreach ($response->json('jobs', []) as $job) {
            $existing = JobListing::where('external_id', $job['external_id'])->first();
            if ($existing && $existing->source === 'employer') continue;
            JobListing::updateOrCreate(
                ['external_id' => $job['external_id']],
                [
                    'source'            => $job['source'],
                    'title'             => $job['title'],
                    'company'           => $job['company'],
                    'url'               => $job['url'],
                    'location'          => $job['location'] ?? null,
                    'posted_at'         => $job['posted_at'] ?? null,
                    'moderation_status' => 'approved',
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

    public function show(int $id)
    {
        $job  = JobListing::findOrFail($id);
        $user = auth('api')->user();
        return response()->json(array_merge($job->toArray(), [
            'saved'   => $user->savedJobs()->where('job_listing_id', $id)->exists(),
            'applied' => $user->applications()->where('job_listing_id', $id)->exists(),
        ]));
    }
}
