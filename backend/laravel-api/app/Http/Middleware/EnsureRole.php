<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    /**
     * Gate a route to one or more roles: `role:employer`, `role:admin`, or
     * `role:employer,admin`. Runs after auth:api, so a user is guaranteed.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = auth('api')->user();

        if (! $user) {
            return response()->json(['error' => 'Unauthenticated.'], 401);
        }

        if ($user->is_blocked) {
            return response()->json([
                'error' => 'Your account has been blocked by an administrator.',
            ], 403);
        }

        // An admin reaches everything; that's the point of the role.
        $allowed = $user->isAdmin() || in_array($user->role, $roles, true);

        if (! $allowed) {
            return response()->json([
                'error' => 'This area is for ' . implode(' or ', $roles) . ' accounts.',
            ], 403);
        }

        return $next($request);
    }
}
