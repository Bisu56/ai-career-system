<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ResumeController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:api')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/upload-resume', [ResumeController::class, 'upload']);
    Route::post('/resume/analyze', [ResumeController::class, 'analyze']);
});
