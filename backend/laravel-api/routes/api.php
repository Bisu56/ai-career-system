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
Route::post('/login',    [AuthController::class, 'login']);

Route::middleware('auth:api')->group(function () {

    Route::get('/me',     [AuthController::class, 'me']);
    Route::post('/logout',[AuthController::class, 'logout']);

    // Resume
    Route::post('/upload-resume',   [ResumeController::class, 'upload'])->middleware('throttle:resume-upload');
    Route::post('/resume/analyze',  [ResumeController::class, 'analyze'])->middleware('throttle:resume-upload');
    Route::get('/resume/history',   [ResumeController::class, 'history']);
    Route::delete('/resume/{id}',   [ResumeController::class, 'delete']);

    // Analytics
    Route::get('/analytics',                      [AnalyticsController::class, 'stats']);
    Route::get('/analytics/career-distribution',  [AnalyticsController::class, 'careerDistribution']);
    Route::get('/analytics/score-history',        [AnalyticsController::class, 'scoreHistory']);

    // ── Admin routes ───────────────────────────────────────────────────────
    Route::prefix('admin')->group(function () {
        // Dashboard & legacy analytics
        Route::get('/dashboard',        [AdminController::class, 'dashboard']);
        Route::get('/analytics',        [AnalyticsController::class, 'adminStats']);

        // User management
        Route::get('/users',                    [AdminController::class, 'index']);
        Route::patch('/users/{id}',             [AdminController::class, 'update']);
        Route::patch('/users/{id}/activate',    [AdminController::class, 'activate']);
        Route::patch('/users/{id}/deactivate',  [AdminController::class, 'deactivate']);
        Route::delete('/users/{id}',            [AdminController::class, 'destroy']);

        // Employer approval
        Route::get('/employers',                [AdminController::class, 'employers']);
        Route::patch('/employers/{id}/approve', [AdminController::class, 'approveEmployer']);
        Route::patch('/employers/{id}/reject',  [AdminController::class, 'rejectEmployer']);

        // Job moderation  — static segments before {id}
        Route::get('/jobs',                     [AdminController::class, 'jobs']);
        Route::post('/jobs/refresh',            [AdminController::class, 'refreshFeed']);
        Route::get('/jobs/{id}',                [AdminController::class, 'showJob']);
        Route::patch('/jobs/{id}/approve',      [AdminController::class, 'approveJob']);
        Route::patch('/jobs/{id}/reject',       [AdminController::class, 'rejectJob']);
        Route::patch('/jobs/{id}/moderation',   [AdminController::class, 'moderateJob']);
    });

    // ── Job seeker job routes ───────────────────────────────────────────────
    Route::get('/jobs',               [JobController::class, 'search']);
    Route::get('/jobs/saved',         [JobController::class, 'saved']);
    Route::post('/jobs/refresh',      [JobController::class, 'refresh']);  // legacy; kept for compat
    Route::get('/jobs/{id}',          [JobController::class, 'show']);
    Route::post('/jobs/{id}/save',    [JobController::class, 'save']);
    Route::delete('/jobs/{id}/save',  [JobController::class, 'unsave']);

    // Application routes
    Route::get('/applications',                     [ApplicationController::class, 'index']);
    Route::get('/applications/summary',             [ApplicationController::class, 'summary']);
    Route::get('/applications/{id}',                [ApplicationController::class, 'show']);
    Route::post('/jobs/{id}/apply',                 [ApplicationController::class, 'apply']);
    Route::patch('/applications/{id}/withdraw',     [ApplicationController::class, 'withdraw']);

    // ── Employer routes ─────────────────────────────────────────────────────
    Route::get('/employer/profile',    [CompanyProfileController::class, 'show']);
    Route::post('/employer/profile',   [CompanyProfileController::class, 'store']);
    Route::patch('/employer/profile',  [CompanyProfileController::class, 'update']);

    Route::get('/employer/jobs',                [EmployerJobController::class, 'index']);
    Route::post('/employer/jobs',               [EmployerJobController::class, 'store']);
    Route::get('/employer/jobs/{id}',           [EmployerJobController::class, 'show']);
    Route::patch('/employer/jobs/{id}',         [EmployerJobController::class, 'update']);
    Route::patch('/employer/jobs/{id}/close',   [EmployerJobController::class, 'close']);
    Route::delete('/employer/jobs/{id}',        [EmployerJobController::class, 'destroy']);

    Route::get('/employer/jobs/{jobId}/applicants',                              [EmployerApplicationController::class, 'index']);
    Route::post('/employer/jobs/{jobId}/applicants/score-all',                   [EmployerApplicationController::class, 'scoreAll']);
    Route::post('/employer/jobs/{jobId}/applicants/{applicationId}/score',       [EmployerApplicationController::class, 'score']);
    Route::patch('/employer/jobs/{jobId}/applicants/{applicationId}/status',     [EmployerApplicationController::class, 'updateStatus']);

    Route::get('/employer/dashboard', function () {
        $user = auth('api')->user();
        if (!$user?->is_employer) return response()->json(['error' => 'Forbidden'], 403);
        $jobIds = $user->jobListings()->pluck('id');
        return response()->json([
            'total_jobs'       => $user->jobListings()->count(),
            'active_jobs'      => $user->jobListings()->where('is_active', true)->count(),
            'closed_jobs'      => $user->jobListings()->where('is_active', false)->count(),
            'total_applicants' => \App\Models\JobApplication::whereIn('job_listing_id', $jobIds)->count(),
            'status_counts'    => \App\Models\JobApplication::whereIn('job_listing_id', $jobIds)
                                    ->selectRaw('status, COUNT(*) as count')->groupBy('status')
                                    ->pluck('count', 'status'),
            'has_profile'      => $user->companyProfile !== null,
            'employer_status'  => $user->employer_status,
        ]);
    });
});
