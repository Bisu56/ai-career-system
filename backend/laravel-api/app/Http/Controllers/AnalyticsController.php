<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\User;
use App\Models\JobListing;
use App\Models\JobApplication;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function stats()
    {
        $userId = auth('api')->id();
        return response()->json([
            'total_analyses' => Resume::where('user_id', $userId)->count(),
            'average_score'  => round(Resume::where('user_id', $userId)->avg('resume_score') ?? 0, 2),
            'top_career'     => Resume::where('user_id', $userId)
                                    ->select('career_prediction')
                                    ->groupBy('career_prediction')
                                    ->orderByRaw('COUNT(*) DESC')
                                    ->value('career_prediction') ?? 'N/A',
            'latest_analysis' => Resume::where('user_id', $userId)->orderByDesc('created_at')->first(),
        ]);
    }

    public function careerDistribution()
    {
        $distribution = Resume::where('user_id', auth('api')->id())
            ->select('career_prediction', DB::raw('count(*) as count'))
            ->groupBy('career_prediction')
            ->get();
        return response()->json($distribution);
    }

    public function scoreHistory()
    {
        $history = Resume::where('user_id', auth('api')->id())
            ->orderBy('created_at', 'asc')
            ->select('resume_score', 'career_prediction', 'created_at')
            ->limit(10)
            ->get();
        return response()->json($history);
    }

    public function adminStats()
    {
        if (!auth('api')->user()?->is_admin) {
            return response()->json(['error' => 'Forbidden'], 403);
        }
        $totalUsers      = User::count();
        $totalAnalyses   = Resume::count();
        $avgScore        = Resume::avg('resume_score');
        $careerDist      = Resume::select('career_prediction', DB::raw('count(*) as count'))
                                 ->groupBy('career_prediction')->get();
        $recentAnalyses  = Resume::with('user')->orderByDesc('created_at')->limit(10)->get();

        return response()->json([
            'total_users'          => $totalUsers,
            'total_job_seekers'    => User::where('is_employer', false)->where('is_admin', false)->count(),
            'total_employers'      => User::where('is_employer', true)->count(),
            'pending_employers'    => User::where('is_employer', true)->where('employer_status', 'pending')->count(),
            'total_jobs'           => JobListing::count(),
            'pending_jobs'         => JobListing::where('moderation_status', 'pending')->count(),
            'active_jobs'          => JobListing::where('is_active', true)->where('moderation_status', 'approved')->count(),
            'total_applications'   => JobApplication::count(),
            'total_analyses'       => $totalAnalyses,
            'average_score'        => round($avgScore ?? 0, 2),
            'career_distribution'  => $careerDist,
            'recent_analyses'      => $recentAnalyses,
        ]);
    }
}
