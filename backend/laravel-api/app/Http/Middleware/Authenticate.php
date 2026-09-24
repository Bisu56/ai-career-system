<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;

class Authenticate extends Middleware
{
    protected function redirectTo($request)
    {
        if ($request->expectsJson()) {
            return null;
        }
    }

    protected function authenticate($request, array $guards)
    {
        parent::authenticate($request, $guards);

        $user = auth('api')->user();
        if ($user && $user->is_active === false) {
            abort(response()->json(['message' => 'Your account has been deactivated. Please contact support.'], 401));
        }
    }

    protected function unauthenticated($request, array $guards)
    {
        abort(response()->json(['message' => 'Unauthenticated.'], 401));
    }
}
