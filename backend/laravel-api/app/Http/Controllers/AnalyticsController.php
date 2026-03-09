<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function stats()
    {
        $total = Resume::where('user_id', auth('api')->id())->count();
        
        $avgScore = Resume::where('user_id', auth('api')->id())
            ->avg('resume_score');
        
        $topCareer = Resume::where('user_id', auth('api')->id())
            ->select('career_prediction')
            ->groupBy('career_prediction')
            ->orderByRaw('COUNT(*) DESC')
            ->first();

        $recentAnalysis = Resume::where('user_id', auth('api')->id())
            ->orderBy('created_at', 'desc')
            ->first();

        return response()->json([
            'total_analyses' => $total,
            'average_score' => round($avgScore ?? 0, 2),
            'top_career' => $topCareer ? $topCareer->career_prediction : 'N/A',
            'latest_analysis' => $recentAnalysis
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
        $totalUsers = \App\Models\User::count();
        $totalAnalyses = Resume::count();
        $avgScore = Resume::avg('resume_score');
        
        $careerDistribution = Resume::select('career_prediction', DB::raw('count(*) as count'))
            ->groupBy('career_prediction')
            ->get();

        $recentAnalyses = Resume::with('user')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'total_users' => $totalUsers,
            'total_analyses' => $totalAnalyses,
            'average_score' => round($avgScore ?? 0, 2),
            'career_distribution' => $careerDistribution,
            'recent_analyses' => $recentAnalyses
        ]);
    }
}
