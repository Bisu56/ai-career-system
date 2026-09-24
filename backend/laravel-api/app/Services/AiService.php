<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Thin client for the FastAPI analysis service.
 *
 * Every call degrades to a sensible empty result rather than throwing: a job
 * should still save, and an applicant list should still render, when the AI
 * service happens to be down.
 */
class AiService
{
    private string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.ai.url', 'http://127.0.0.1:8001'), '/');
    }

    /**
     * The skills a job description implies, so a posting is tagged even when
     * the employer leaves the skills box empty.
     *
     * @return array<int, string>
     */
    public function jobSkills(string $title, string $description, array $skills = []): array
    {
        $data = $this->post('/job-skills', [
            'title' => $title,
            'description' => $description,
            'skills' => array_values($skills),
        ]);

        return $data['skills'] ?? array_values($skills);
    }

    /**
     * Rank applicants against a job post.
     *
     * @param  array<int, array{id:int, skills:array, career:string}>  $applicants
     * @return array<int, array{id:int, match_percentage:float, matched_skills:array, missing_skills:array}>
     *         keyed by applicant id, empty when the service is unreachable.
     */
    public function rankApplicants(array $job, array $applicants): array
    {
        if ($applicants === []) {
            return [];
        }

        $data = $this->post('/match', [
            'job' => $job,
            'applicants' => array_values($applicants),
        ]);

        return collect($data['applicants'] ?? [])->keyBy('id')->all();
    }

    /**
     * Score one candidate against one job - used at apply time.
     *
     * @return array{match_percentage: float, matched_skills: array, missing_skills: array}
     */
    public function scoreApplicant(array $job, int $applicantId, array $skills, string $career = ''): array
    {
        $ranked = $this->rankApplicants($job, [[
            'id' => $applicantId,
            'skills' => array_values($skills),
            'career' => $career,
        ]]);

        $result = $ranked[$applicantId] ?? null;

        return [
            'match_percentage' => (float) ($result['match_percentage'] ?? 0),
            'matched_skills' => $result['matched_skills'] ?? [],
            'missing_skills' => $result['missing_skills'] ?? [],
        ];
    }

    private function post(string $path, array $payload): array
    {
        try {
            $response = Http::timeout(30)->post($this->baseUrl . $path, $payload);

            if ($response->failed()) {
                Log::warning('AI service returned an error', [
                    'path' => $path,
                    'status' => $response->status(),
                ]);

                return [];
            }

            return $response->json() ?? [];
        } catch (Throwable $e) {
            // Unreachable service must not take the request down with it.
            Log::warning('AI service unreachable', ['path' => $path, 'error' => $e->getMessage()]);

            return [];
        }
    }
}
