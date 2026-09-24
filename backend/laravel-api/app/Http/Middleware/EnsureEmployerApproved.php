<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmployerApproved
{
    /**
     * Blocks the routes that publish to job seekers until an admin has
     * approved the employer. Setting up a company profile stays open, so a
     * new employer has something to do while they wait.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth('api')->user();

        if ($user && $user->isEmployer() && ! $user->is_approved) {
            return response()->json([
                'error' => 'Your employer account is waiting for admin approval.',
                'pending_approval' => true,
            ], 403);
        }

        return $next($request);
    }
}
