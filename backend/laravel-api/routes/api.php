<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ResumeController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\JobController;
use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\AdminController;
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

    // Job routes — ordered so static segments (/saved, /refresh) come before {id}
    Route::get('/jobs', [JobController::class, 'search']);
    Route::get('/jobs/saved', [JobController::class, 'saved']);
    Route::post('/jobs/refresh', [JobController::class, 'refresh']);
    Route::get('/jobs/{id}', [JobController::class, 'show']);
    Route::post('/jobs/{id}/save', [JobController::class, 'save']);
    Route::delete('/jobs/{id}/save', [JobController::class, 'unsave']);

    // Application routes
    Route::get('/applications', [ApplicationController::class, 'index']);
    Route::get('/applications/summary', [ApplicationController::class, 'summary']);
    Route::get('/applications/{id}', [ApplicationController::class, 'show']);
    Route::post('/jobs/{id}/apply', [ApplicationController::class, 'apply']);
    Route::patch('/applications/{id}/withdraw', [ApplicationController::class, 'withdraw']);
});
