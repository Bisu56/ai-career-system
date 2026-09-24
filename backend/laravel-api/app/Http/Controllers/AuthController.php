<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255',
            'email'       => 'required|string|email|max:255|unique:users',
            'password'    => [
                'required', 'string', 'min:8', 'confirmed',
                'regex:/[A-Z]/', 'regex:/[0-9]/',
            ],
            'is_employer' => 'sometimes|boolean',
        ], [
            'password.regex' => 'Password must contain at least one uppercase letter and one number.',
        ]);

        $isEmployer = $validated['is_employer'] ?? false;

        $user = User::create([
            'name'            => $validated['name'],
            'email'           => $validated['email'],
            'password'        => Hash::make($validated['password']),
            'is_employer'     => $isEmployer,
            // Employers start pending; non-employers default doesn't matter
            'employer_status' => $isEmployer ? 'pending' : 'approved',
            'is_active'       => true,
        ]);

        $token = auth('api')->login($user);

        return response()->json([
            'message' => 'User created',
            'token'   => $token,
            'user'    => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email'    => 'required|string|email',
            'password' => 'required|string',
        ]);

        if (!$token = auth('api')->attempt($credentials)) {
            return response()->json(['error' => 'Invalid Credentials'], 401);
        }

        $user = auth('api')->user();

        // Block deactivated accounts
        if (!$user->is_active) {
            auth('api')->logout();
            return response()->json(['error' => 'Your account has been deactivated. Please contact support.'], 403);
        }

        return response()->json([
            'token' => $token,
            'user'  => $user,
        ]);
    }

    public function me()
    {
        return response()->json(auth('api')->user());
    }

    public function logout()
    {
        auth('api')->logout();
        return response()->json(['message' => 'Logged out successfully']);
    }
}
