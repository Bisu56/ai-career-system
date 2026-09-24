<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        RateLimiter::for('resume-upload', function (Request $request) {
            return Limit::perMinute(10)->by($request->user()?->id ?? $request->ip());
        });

        RateLimiter::for('auth', function (Request $request) {
            return [
                Limit::perMinute(10)->by('auth-ip:' . $request->ip()),
                Limit::perMinute(5)->by('auth-email:' . strtolower((string) $request->input('email'))),
            ];
        });

        Route::pattern('id', '[0-9]+');
        Route::pattern('jobId', '[0-9]+');
        Route::pattern('applicationId', '[0-9]+');

        Builder::macro('whereContains', function (array $columns, string $term) {
            $pattern = '%' . addcslashes($term, '\\%_') . '%';

            return $this->where(function ($query) use ($columns, $pattern) {
                foreach ($columns as $column) {
                    $query->orWhereRaw("{$column} LIKE ? ESCAPE '\\'", [$pattern]);
                }
            });
        });
    }
}
