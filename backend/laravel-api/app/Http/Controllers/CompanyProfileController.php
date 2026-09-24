<?php

namespace App\Http\Controllers;

use App\Models\CompanyProfile;
use Illuminate\Http\Request;

class CompanyProfileController extends Controller
{
    /** Guard: only employers may call these actions. */
    private function authorizeEmployer()
    {
        if (!auth('api')->user()?->is_employer) {
            abort(response()->json(['error' => 'Forbidden: employer access required.'], 403));
        }
    }

    /**
     * GET /api/employer/profile
     * Returns the authenticated employer's company profile (or 404 if none yet).
     */
    public function show()
    {
        $this->authorizeEmployer();

        $profile = auth('api')->user()->companyProfile;

        if (!$profile) {
            return response()->json(['error' => 'No company profile found.'], 404);
        }

        return response()->json($profile);
    }

    /**
     * POST /api/employer/profile
     * Creates the company profile for the current employer (one per employer).
     */
    public function store(Request $request)
    {
        $this->authorizeEmployer();

        $user = auth('api')->user();

        if ($user->companyProfile) {
            return response()->json(['error' => 'Company profile already exists. Use PATCH to update it.'], 409);
        }

        $validated = $request->validate([
            'company_name'  => 'required|string|max:255',
            'description'   => 'nullable|string|max:5000',
            'location'      => 'nullable|string|max:255',
            'website'       => 'nullable|url|max:500',
            'contact_email' => 'nullable|email|max:255',
        ]);

        $profile = $user->companyProfile()->create($validated);

        return response()->json($profile, 201);
    }

    /**
     * PATCH /api/employer/profile
     * Updates fields on the existing company profile.
     */
    public function update(Request $request)
    {
        $this->authorizeEmployer();

        $user    = auth('api')->user();
        $profile = $user->companyProfile;

        if (!$profile) {
            return response()->json(['error' => 'No company profile found. Create one first.'], 404);
        }

        $validated = $request->validate([
            'company_name'  => 'sometimes|string|max:255',
            'description'   => 'sometimes|nullable|string|max:5000',
            'location'      => 'sometimes|nullable|string|max:255',
            'website'       => 'sometimes|nullable|url|max:500',
            'contact_email' => 'sometimes|nullable|email|max:255',
        ]);

        $profile->update($validated);

        return response()->json($profile->fresh());
    }
}
