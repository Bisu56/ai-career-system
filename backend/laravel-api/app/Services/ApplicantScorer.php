<?php

namespace App\Services;

use App\Models\JobApplication;
use App\Models\JobListing;
use Illuminate\Support\Facades\Http;

class ApplicantScorer
{
    public function scoreAndSave(JobApplication $application): array
    {
        $scoreData = $this->score($application, $application->job);

        $application->update([
            'ai_match_score' => $scoreData['score'],
            'matched_skills' => $scoreData['matched_skills'],
            'missing_skills' => $scoreData['missing_skills'],
        ]);

        return $scoreData;
    }

    public function score(JobApplication $application, JobListing $job): array
    {
        $requiredSkills  = array_map('strtolower', $job->required_skills ?? []);
        $applicantSkills = $this->applicantSkills($application);
        $applicantText   = $this->applicantText($application, $applicantSkills);

        if (empty($requiredSkills)) {
            return $this->scoreByText($applicantText, $job->description ?? $job->title, $applicantSkills);
        }

        try {
            $response = Http::timeout(10)->post(config('services.ai.url') . '/match', [
                'applicant_skills' => $applicantSkills,
                'required_skills'  => $requiredSkills,
                'applicant_text'   => $applicantText,
                'job_text'         => $this->jobText($job),
                'experience_level' => $job->experience_level,
                'education'        => $job->education,
            ]);

            if ($response->ok()) {
                $data = $response->json();
                return [
                    'score'          => round($data['score'] ?? 0, 2),
                    'matched_skills' => $data['matched_skills'] ?? [],
                    'missing_skills' => $data['missing_skills'] ?? [],
                ];
            }
        } catch (\Exception $e) {
        }

        return self::overlap($requiredSkills, $applicantSkills);
    }

    public static function overlap(array $requiredSkills, array $applicantSkills): array
    {
        if (empty($requiredSkills)) {
            return ['score' => 0.0, 'matched_skills' => [], 'missing_skills' => []];
        }

        $matched = array_values(array_intersect($requiredSkills, $applicantSkills));

        return [
            'score'          => round(count($matched) / count($requiredSkills) * 100, 2),
            'matched_skills' => $matched,
            'missing_skills' => array_values(array_diff($requiredSkills, $applicantSkills)),
        ];
    }

    private function applicantSkills(JobApplication $application): array
    {
        $resume = $application->resume;

        return $resume && !empty($resume->skills)
            ? array_map('strtolower', (array) $resume->skills)
            : [];
    }

    private function applicantText(JobApplication $application, array $skills): string
    {
        return implode(' ', array_filter([
            $application->user?->name,
            implode(' ', $skills),
            $application->cover_letter,
        ]));
    }

    private function jobText(JobListing $job): string
    {
        return implode(' ', array_filter([
            $job->title,
            $job->description,
            implode(' ', $job->required_skills ?? []),
            $job->experience_level,
            $job->education,
        ]));
    }

    private function scoreByText(string $applicantText, string $jobText, array $applicantSkills): array
    {
        try {
            $response = Http::timeout(10)->post(config('services.ai.url') . '/analyze', [
                'resume' => $applicantText,
                'job'    => $jobText,
            ]);
            if ($response->ok()) {
                $data = $response->json();
                return [
                    'score'          => round($data['match_percentage'] ?? 0, 2),
                    'matched_skills' => $data['extracted_skills'] ?? $applicantSkills,
                    'missing_skills' => $data['missing_skills'] ?? [],
                ];
            }
        } catch (\Exception $e) {
        }

        return ['score' => 0.0, 'matched_skills' => [], 'missing_skills' => []];
    }
}
