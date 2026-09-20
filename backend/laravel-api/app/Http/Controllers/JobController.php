<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Exception;

class JobController extends Controller
{
    /**
     * Live job listings ranked against the signed-in user's resume.
     *
     * Skills default to the most recent resume the user uploaded, so the page
     * works with no parameters; ?resume_id= picks an older one instead.
     */
    public function index(Request $request)
    {
        $request->validate([
            'resume_id'   => 'nullable|integer',
            'search'      => 'nullable|string|max:100',
            'location'    => 'nullable|string|max:100',
            // Not `boolean`: query strings arrive as the literal "true"/"false"
            // that axios serialises, which that rule rejects.
            'remote_only' => 'nullable|in:1,0,true,false',
            'refresh'     => 'nullable|in:1,0,true,false',
            'min_match'   => 'nullable|numeric|min:0|max:100',
            'limit'       => 'nullable|integer|min:1|max:100',
        ]);

        $resume = Resume::where('user_id', auth('api')->id())
            ->when($request->filled('resume_id'), fn ($q) => $q->where('id', $request->input('resume_id')))
            ->orderByDesc('created_at')
            ->first();

        if (! $resume) {
            return response()->json([
                'jobs'   => [],
                'total'  => 0,
                'resume' => null,
                'message' => 'Upload a resume first to see jobs matched to your skills.',
            ]);
        }

        // The city parsed from the resume flags and lifts nearby roles, but it
        // never filters: these boards are remote-heavy, so narrowing to one
        // city by default would empty the page. The user can still filter by
        // location explicitly.
        // The full string ("Austin, TX") is sent so both the city and the state
        // or country can flag a nearby role; the bare city is what the UI puts
        // in the filter box.
        $home = $resume->location && strcasecmp($resume->location, 'Remote') !== 0
            ? $resume->location
            : '';

        try {
            $response = Http::timeout(45)->post('http://127.0.0.1:8001/jobs', [
                'skills'      => $resume->skills ?? [],
                'career'      => $resume->career_prediction ?? '',
                'search'      => (string) $request->input('search', ''),
                'location'    => (string) $request->input('location', ''),
                'home_location' => $home,
                'remote_only' => $request->boolean('remote_only'),
                'min_match'   => (float) $request->input('min_match', 0),
                'limit'       => (int) $request->input('limit', 30),
                'refresh'     => $request->boolean('refresh'),
            ]);

            $data = $response->json();
        } catch (Exception $e) {
            return response()->json([
                'jobs'  => [],
                'total' => 0,
                'error' => 'Job service unavailable: ' . $e->getMessage(),
            ], 503);
        }

        return response()->json([
            ...$data,
            'resume' => [
                'id'          => $resume->id,
                'career'      => $resume->career_prediction,
                'skills'      => $resume->skills ?? [],
                'location'    => $resume->location,
                'uploaded_at' => $resume->created_at,
            ],
            'home_location'      => $home,
            'home_location_city' => $home === '' ? '' : $this->cityOf($home),
        ]);
    }

    /**
     * "Austin, TX" -> "Austin". Job boards write locations inconsistently, so
     * matching on the city alone finds far more than the full string would.
     */
    private function cityOf(string $location): string
    {
        return trim(explode(',', $location)[0]);
    }
}
