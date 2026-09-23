<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    /**
     * Guard: only admins may call these actions.
     */
    private function authorizeAdmin()
    {
        if (!auth('api')->user()?->is_admin) {
            abort(response()->json(['error' => 'Forbidden'], 403));
        }
    }

    /**
     * GET /api/admin/users
     * Returns a paginated list of all users, optionally filtered by ?search=
     */
    public function index(Request $request)
    {
        $this->authorizeAdmin();

        $perPage = max(1, min(100, (int) $request->get('per_page', 10)));
        $search  = $request->get('search', '');

        $query = User::query();

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name',  'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%");
            });
        }

        $users = $query
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json($users);
    }

    /**
     * PATCH /api/admin/users/{id}
     * Updates is_admin (and optionally name/email) for the given user.
     * Prevents removing admin from the currently-authenticated user.
     */
    public function update(Request $request, int $id)
    {
        $this->authorizeAdmin();

        $user = User::findOrFail($id);

        $validated = $request->validate([
            'is_admin' => 'sometimes|boolean',
            'name'     => 'sometimes|string|max:255',
            'email'    => 'sometimes|email|unique:users,email,' . $id,
        ]);

        // Safety: prevent an admin from removing their own admin flag
        if (
            array_key_exists('is_admin', $validated) &&
            !$validated['is_admin'] &&
            $user->id === auth('api')->id()
        ) {
            return response()->json(['error' => 'You cannot remove your own admin status.'], 422);
        }

        $user->update($validated);

        return response()->json($user->fresh());
    }

    /**
     * DELETE /api/admin/users/{id}
     * Permanently deletes a user account.
     * Prevents an admin from deleting themselves.
     */
    public function destroy(int $id)
    {
        $this->authorizeAdmin();

        $user = User::findOrFail($id);

        if ($user->id === auth('api')->id()) {
            return response()->json(['error' => 'You cannot delete your own account.'], 422);
        }

        $user->delete();

        return response()->json(['deleted' => true]);
    }
}
