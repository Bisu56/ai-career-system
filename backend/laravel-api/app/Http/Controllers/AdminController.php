<?php

namespace App\Http\Controllers;

use App\Models\JobListing;
use App\Models\JobApplication;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

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
        ]);
    }

    public function index(Request $request)
    {
        $this->authorizeAdmin();
        $perPage = max(1, min(100, (int) $request->get('per_page', 15)));
        $search  = $request->get('search', '');
        $role    = $request->get('role', '');
        $query   = User::with('companyProfile:id,user_id,company_name');
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")->orWhere('email', 'LIKE', "%{$search}%");
            });
        }
        if ($role === 'employer')   $query->where('is_employer', true);
        elseif ($role === 'seeker') $query->where('is_employer', false)->where('is_admin', false);
        elseif ($role === 'admin')  $query->where('is_admin', true);
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
        $user->delete();
        return response()->json(['deleted' => true]);
    }

    public function employers(Request $request)
    {
        $this->authorizeAdmin();
        $status = $request->get('status', '');
        $query  = User::where('is_employer', true)
                      ->with('companyProfile:id,user_id,company_name,location,website');
        if (in_array($status, ['pending', 'approved', 'rejected']))
            $query->where('employer_status', $status);
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
        $status = $request->get('status', '');
        $query  = JobListing::with('employer:id,name,email')->withCount('applications');
        if (in_array($status, ['pending', 'approved', 'rejected']))
            $query->where('moderation_status', $status);
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

    public function refreshFeed(Request $request)
    {
        $this->authorizeAdmin();
        $keyword  = $request->get('keyword', 'python');
        $limit    = min((int) $request->get('limit', 100), 200);
        $aiUrl    = config('services.ai.url', env('AI_SERVICE_URL', 'http://127.0.0.1:8001'));
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
            $existing = JobListing::where('external_id', $job['external_id'])->first();
            if ($existing && $existing->source === 'employer') { $skipped++; continue; }
            JobListing::updateOrCreate(
                ['external_id' => $job['external_id']],
                [
                    'source'            => $job['source']    ?? 'external',
                    'title'             => $job['title'],
                    'company'           => $job['company']   ?? 'Unknown',
                    'url'               => $job['url']       ?? '#',
                    'location'          => $job['location']  ?? null,
                    'posted_at'         => $job['posted_at'] ?? null,
                    'is_active'         => true,
                    'moderation_status' => 'approved',
                ]
            );
            $imported++;
        }
        return response()->json(['imported' => $imported, 'skipped' => $skipped, 'keyword' => $keyword]);
    }
}
