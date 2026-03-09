<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ResumeController;
use App\Http\Controllers\AnalyticsController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:api')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    
    Route::post('/upload-resume', [ResumeController::class, 'upload']);
    Route::post('/resume/analyze', [ResumeController::class, 'analyze']);
    Route::get('/resume/history', [ResumeController::class, 'history']);
    Route::delete('/resume/{id}', [ResumeController::class, 'delete']);
    
    Route::get('/analytics', [AnalyticsController::class, 'stats']);
    Route::get('/analytics/career-distribution', [AnalyticsController::class, 'careerDistribution']);
    Route::get('/analytics/score-history', [AnalyticsController::class, 'scoreHistory']);
});

Route::get('/admin/analytics', [AnalyticsController::class, 'adminStats']);
