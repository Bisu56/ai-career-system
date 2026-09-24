<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ResumeController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\JobController;
use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\CompanyProfileController;
use App\Http\Controllers\EmployerJobController;
use App\Http\Controllers\EmployerApplicationController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:api')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::post('/upload-resume', [ResumeController::class, 'upload'])->middleware('throttle:resume-upload');
    Route::post('/resume/analyze', [ResumeController::class, 'analyze'])->middleware('throttle:resume-upload');
    Route::get('/resume/history', [ResumeController::class, 'history']);
    Route::delete('/resume/{id}', [ResumeController::class, 'delete']);

    Route::get('/analytics', [AnalyticsController::class, 'stats']);
    Route::get('/analytics/career-distribution', [AnalyticsController::class, 'careerDistribution']);
    Route::get('/analytics/score-history', [AnalyticsController::class, 'scoreHistory']);

    // Admin routes
    Route::get('/admin/analytics', [AnalyticsController::class, 'adminStats']);
    Route::get('/admin/users', [AdminController::class, 'index']);
    Route::patch('/admin/users/{id}', [AdminController::class, 'update']);
    Route::delete('/admin/users/{id}', [AdminController::class, 'destroy']);

    // Job seeker job routes — static segments before {id}
    Route::get('/jobs', [JobController::class, 'search']);
    Route::get('/jobs/saved', [JobController::class, 'saved']);
    Route::post('/jobs/refresh', [JobController::class, 'refresh']);
    Route::get('/jobs/{id}', [JobController::class, 'show']);
    Route::post('/jobs/{id}/save', [JobController::class, 'save']);
    Route::delete('/jobs/{id}/save', [JobController::class, 'unsave']);

    // Job seeker application routes
    Route::get('/applications', [ApplicationController::class, 'index']);
    Route::get('/applications/summary', [ApplicationController::class, 'summary']);
    Route::get('/applications/{id}', [ApplicationController::class, 'show']);
    Route::post('/jobs/{id}/apply', [ApplicationController::class, 'apply']);
    Route::patch('/applications/{id}/withdraw', [ApplicationController::class, 'withdraw']);

    // ── Employer routes ────────────────────────────────────────────────────────

    // Company profile (one per employer)
    Route::get('/employer/profile', [CompanyProfileController::class, 'show']);
    Route::post('/employer/profile', [CompanyProfileController::class, 'store']);
    Route::patch('/employer/profile', [CompanyProfileController::class, 'update']);

    // Employer job management
    Route::get('/employer/jobs', [EmployerJobController::class, 'index']);
    Route::post('/employer/jobs', [EmployerJobController::class, 'store']);
    Route::get('/employer/jobs/{id}', [EmployerJobController::class, 'show']);
    Route::patch('/employer/jobs/{id}', [EmployerJobController::class, 'update']);
    Route::patch('/employer/jobs/{id}/close', [EmployerJobController::class, 'close']);
    Route::delete('/employer/jobs/{id}', [EmployerJobController::class, 'destroy']);

    // Employer applicant management
    Route::get('/employer/jobs/{jobId}/applicants', [EmployerApplicationController::class, 'index']);
    Route::post('/employer/jobs/{jobId}/applicants/{applicationId}/score', [EmployerApplicationController::class, 'score']);
    Route::post('/employer/jobs/{jobId}/applicants/score-all', [EmployerApplicationController::class, 'scoreAll']);
    Route::patch('/employer/jobs/{jobId}/applicants/{applicationId}/status', [EmployerApplicationController::class, 'updateStatus']);

    // Employer dashboard summary
    Route::get('/employer/dashboard', function () {
        $user = auth('api')->user();
        if (!$user?->is_employer) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $totalJobs      = $user->jobListings()->count();
        $activeJobs     = $user->jobListings()->where('is_active', true)->count();
        $closedJobs     = $user->jobListings()->where('is_active', false)->count();
        $totalApplicants = \App\Models\JobApplication::whereIn(
            'job_listing_id',
            $user->jobListings()->pluck('id')
        )->count();

        $statusCounts = \App\Models\JobApplication::whereIn(
            'job_listing_id',
            $user->jobListings()->pluck('id')
        )
        ->selectRaw('status, COUNT(*) as count')
        ->groupBy('status')
        ->pluck('count', 'status');

        return response()->json([
            'total_jobs'       => $totalJobs,
            'active_jobs'      => $activeJobs,
            'closed_jobs'      => $closedJobs,
            'total_applicants' => $totalApplicants,
            'status_counts'    => $statusCounts,
            'has_profile'      => $user->companyProfile !== null,
        ]);
    });
});
