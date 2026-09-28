<?php

namespace App\Http\Controllers;

use App\Models\JobListing;
use App\Models\JobApplication;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class AdminController extends Controller
{
    private function authorizeAdmin(): void
    {
        if (!auth('api')->user()?->is_admin) {
            abort(response()->json(['error' => 'Forbidden'], 403));
        }
    }

    public function dashboard()
    {
        $this->authorizeAdmin();
        return response()->json([
            'total_users'        => User::count(),
            'total_job_seekers'  => User::where('is_employer', false)->where('is_admin', false)->count(),
            'total_employers'    => User::where('is_employer', true)->count(),
            'pending_employers'  => User::where('is_employer', true)->where('employer_status', 'pending')->count(),
            'active_users'       => User::where('is_active', true)->count(),
            'deactivated_users'  => User::where('is_active', false)->count(),
            'total_jobs'         => JobListing::count(),
            'active_jobs'        => JobListing::where('is_active', true)->where('moderation_status', 'approved')->count(),
            'pending_jobs'       => JobListing::where('moderation_status', 'pending')->count(),
            'rejected_jobs'      => JobListing::where('moderation_status', 'rejected')->count(),
            'total_applications' => JobApplication::count(),
            'total_analyses'     => Resume::count(),
            'average_score'      => round(Resume::avg('resume_score') ?? 0, 2),
            'career_distribution' => Resume::select('career_prediction', DB::raw('count(*) as count'))
                                        ->groupBy('career_prediction')->orderByDesc('count')->get(),
            'jobs_by_source'     => JobListing::select('source', DB::raw('count(*) as count'))
                                        ->groupBy('source')->get(),
            'recent_analyses'    => Resume::with('user:id,name,email')
                                        ->select('id', 'user_id', 'career_prediction', 'resume_score', 'created_at')
                                        ->orderByDesc('created_at')->limit(8)->get(),
            'recent_applications' => JobApplication::with(['user:id,name', 'job:id,title,company'])
                                        ->orderByDesc('created_at')->limit(8)->get(),
        ]);
    }

    public function index(Request $request)
    {
        $this->authorizeAdmin();
        $filters = $this->listFilters($request, ['role' => 'nullable|string', 'status' => 'nullable|string', 'per_page' => 'nullable|integer']);
        $perPage = ($filters['per_page'] ?? 0) >= 1 ? min(100, (int) $filters['per_page']) : 15;
        $search  = $filters['search'];
        $role    = $filters['role'] ?? '';
        $status  = $filters['status'] ?? '';
        $query   = User::with('companyProfile:id,user_id,company_name')
                       ->withCount(['applications', 'jobListings']);
        if ($search !== '') {
            $query->whereContains(['name', 'email'], $search);
        }
        if ($role === 'employer')   $query->where('is_employer', true);
        elseif ($role === 'seeker') $query->where('is_employer', false)->where('is_admin', false);
        elseif ($role === 'admin')  $query->where('is_admin', true);
        if ($status === 'active')       $query->where('is_active', true);
        elseif ($status === 'inactive') $query->where('is_active', false);
        return response()->json($query->orderByDesc('created_at')->paginate($perPage));
    }

    public function update(Request $request, int $id)
    {
        $this->authorizeAdmin();
        $user      = User::findOrFail($id);
        $validated = $request->validate([
            'is_admin'  => 'sometimes|boolean',
            'is_active' => 'sometimes|boolean',
            'name'      => 'sometimes|string|max:255',
            'email'     => 'sometimes|email|unique:users,email,' . $id,
        ]);
        if (isset($validated['is_admin']) && !$validated['is_admin'] && $user->id === auth('api')->id())
            return response()->json(['error' => 'You cannot remove your own admin status.'], 422);
        if (isset($validated['is_active']) && !$validated['is_active'] && $user->id === auth('api')->id())
            return response()->json(['error' => 'You cannot deactivate your own account.'], 422);
        $user->update($validated);
        return response()->json($user->fresh()->load('companyProfile:id,user_id,company_name'));
    }

    public function activate(int $id)
    {
        $this->authorizeAdmin();
        $user = User::findOrFail($id);
        $user->update(['is_active' => true]);
        return response()->json(['message' => "User \"{$user->name}\" activated.", 'user' => $user->fresh()]);
    }

    public function deactivate(int $id)
    {
        $this->authorizeAdmin();
        $user = User::findOrFail($id);
        if ($user->id === auth('api')->id())
            return response()->json(['error' => 'You cannot deactivate your own account.'], 422);
        $user->update(['is_active' => false]);
        return response()->json(['message' => "User \"{$user->name}\" deactivated.", 'user' => $user->fresh()]);
    }

    public function destroy(int $id)
    {
        $this->authorizeAdmin();
        $user = User::findOrFail($id);
        if ($user->id === auth('api')->id())
            return response()->json(['error' => 'You cannot delete your own account.'], 422);
        Resume::where('user_id', $user->id)->whereNotNull('file_path')->pluck('file_path')
            ->each(fn ($path) => Storage::delete($path));
        $user->delete();
        return response()->json(['deleted' => true]);
    }

    public function employers(Request $request)
    {
        $this->authorizeAdmin();
        $filters = $this->listFilters($request, ['status' => 'nullable|string']);
        $status = $filters['status'] ?? '';
        $search = $filters['search'];
        $query  = User::where('is_employer', true)
                      ->with('companyProfile:id,user_id,company_name,description,location,website,contact_email')
                      ->withCount('jobListings');
        if (in_array($status, ['pending', 'approved', 'rejected']))
            $query->where('employer_status', $status);
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->whereContains(['name', 'email'], $search)
                  ->orWhereHas('companyProfile', fn ($c) => $c->whereContains(['company_name'], $search));
            });
        }
        return response()->json($query->orderByDesc('created_at')->paginate(15));
    }

    public function approveEmployer(int $id)
    {
        $this->authorizeAdmin();
        $employer = User::where('id', $id)->where('is_employer', true)->firstOrFail();
        $employer->update(['employer_status' => 'approved']);
        return response()->json(['message' => "Employer \"{$employer->name}\" approved.", 'user' => $employer->fresh()]);
    }

    public function rejectEmployer(int $id)
    {
        $this->authorizeAdmin();
        $employer = User::where('id', $id)->where('is_employer', true)->firstOrFail();
        $employer->update(['employer_status' => 'rejected']);
        return response()->json(['message' => "Employer \"{$employer->name}\" rejected.", 'user' => $employer->fresh()]);
    }

    public function jobs(Request $request)
    {
        $this->authorizeAdmin();
        $filters = $this->listFilters($request, ['status' => 'nullable|string', 'source' => 'nullable|string', 'q' => 'nullable|string|max:200']);
        $status = $filters['status'] ?? '';
        $search = trim($filters['q'] ?? '');
        $query  = JobListing::with('employer:id,name,email')->withCount('applications');
        if (in_array($status, ['pending', 'approved', 'rejected']))
            $query->where('moderation_status', $status);
        $query->fromSource($filters['source'] ?? null);
        if ($search !== '') {
            $query->whereContains(['title', 'company'], $search);
        }
        return response()->json($query->orderByDesc('created_at')->paginate(20));
    }

    public function showJob(int $id)
    {
        $this->authorizeAdmin();
        $job = JobListing::with('employer:id,name,email')->withCount('applications')->findOrFail($id);
        return response()->json($job);
    }

    public function approveJob(int $id)
    {
        $this->authorizeAdmin();
        $job = JobListing::findOrFail($id);
        $job->update(['moderation_status' => 'approved']);
        return response()->json(['message' => "Job \"{$job->title}\" approved.", 'job' => $job->fresh()]);
    }

    public function rejectJob(int $id)
    {
        $this->authorizeAdmin();
        $job = JobListing::findOrFail($id);
        $job->update(['moderation_status' => 'rejected']);
        return response()->json(['message' => "Job \"{$job->title}\" rejected.", 'job' => $job->fresh()]);
    }

    public function moderateJob(Request $request, int $id)
    {
        $this->authorizeAdmin();
        $validated = $request->validate(['moderation_status' => 'required|in:pending,approved,rejected']);
        $job = JobListing::findOrFail($id);
        $job->update($validated);
        return response()->json($job->fresh()->load('employer:id,name,email'));
    }

    public function destroyJob(int $id)
    {
        $this->authorizeAdmin();
        $job = JobListing::findOrFail($id);
        $job->delete();
        return response()->json(['deleted' => true]);
    }

    public function feedStatus()
    {
        $this->authorizeAdmin();
        $sources = JobListing::external()
            ->select('source', DB::raw('count(*) as count'), DB::raw('max(updated_at) as last_imported'))
            ->groupBy('source')->get()
            ->map(fn ($s) => [
                'source'        => $s->source,
                'count'         => (int) $s->count,
                'last_imported' => $s->last_imported ? Carbon::parse($s->last_imported, 'UTC')->toIso8601String() : null,
            ]);
        return response()->json([
            'total_external' => $sources->sum('count'),
            'sources'        => $sources,
            'adzuna_enabled' => $this->adzunaEnabled(),
        ]);
    }

    private function adzunaEnabled(): bool
    {
        return Cache::remember('adzuna_enabled', 600, function () {
            try {
                $response = Http::timeout(3)->get(config('services.ai.url') . '/jobs/sources');
                return $response->ok() && (bool) $response->json('adzuna_enabled');
            } catch (\Exception $e) {
                return false;
            }
        });
    }

    private function listFilters(Request $request, array $rules): array
    {
        $validated = $request->validate(array_merge(['search' => 'nullable|string|max:200', 'page' => 'nullable|integer'], $rules));
        $validated['search'] = trim($validated['search'] ?? '');

        return $validated;
    }

    private function parseFeedDate($value): ?Carbon
    {
        if (!$value) {
            return null;
        }
        try {
            return Carbon::parse($value)->utc();
        } catch (\Exception $e) {
            return null;
        }
    }

    public function refreshFeed(Request $request)
    {
        $this->authorizeAdmin();
        $validated = $request->validate([
            'keyword' => 'nullable|string|max:100',
            'limit'   => 'nullable|integer|min:1|max:100',
        ]);
        $keyword  = trim($validated['keyword'] ?? '') ?: 'python';
        $limit    = (int) ($validated['limit'] ?? 50);
        $aiUrl    = config('services.ai.url');
        try {
            $response = Http::timeout(30)->get("{$aiUrl}/jobs/feed", ['keyword' => $keyword, 'limit' => $limit]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'AI service unreachable: ' . $e->getMessage(), 'imported' => 0], 502);
        }
        if (!$response->ok())
            return response()->json(['error' => 'AI service returned ' . $response->status(), 'imported' => 0], 502);
        $imported = 0; $skipped = 0;
        foreach ($response->json('jobs', []) as $job) {
            if (empty($job['external_id']) || empty($job['title'])) { $skipped++; continue; }
            $existing = JobListing::where('external_id', $job['external_id'])
                ->when(!empty($job['url']), fn ($q) => $q->orWhere('url', $job['url']))
                ->first();
            if ($existing && $existing->source === 'employer') { $skipped++; continue; }
            $listing = $existing ?? new JobListing([
                'external_id'       => $job['external_id'],
                'is_active'         => true,
                'moderation_status' => 'approved',
            ]);
            $listing->fill([
                'source'    => $job['source']   ?? 'external',
                'title'     => mb_substr($job['title'], 0, 255),
                'company'   => mb_substr($job['company'] ?? 'Unknown', 0, 255),
                'url'       => $job['url']      ?? '#',
                'location'  => $job['location'] ?? null,
                'posted_at' => $this->parseFeedDate($job['posted_at'] ?? null),
            ])->save();
            $imported++;
        }
        return response()->json([
            'imported'       => $imported,
            'skipped'        => $skipped,
            'keyword'        => $keyword,
            'total_external' => JobListing::external()->count(),
        ]);
    }
}
