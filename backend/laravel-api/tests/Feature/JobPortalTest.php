<?php

namespace Tests\Feature;

use App\Models\JobApplication;
use App\Models\JobListing;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class JobPortalTest extends TestCase
{
    use RefreshDatabase;

    private function seeker(): User
    {
        return User::factory()->create(['is_active' => true]);
    }

    private function employer(): User
    {
        return User::factory()->create([
            'is_employer'     => true,
            'employer_status' => 'approved',
            'is_active'       => true,
        ]);
    }

    private function job(array $attrs = []): JobListing
    {
        return JobListing::create(array_merge([
            'employer_id'       => $this->employer()->id,
            'source'            => 'employer',
            'external_id'       => uniqid('job_'),
            'title'             => 'Laravel Backend Developer',
            'company'           => 'Acme',
            'url'               => 'http://localhost',
            'is_active'         => true,
            'moderation_status' => 'approved',
            'required_skills'   => ['php', 'laravel', 'sql', 'docker'],
        ], $attrs));
    }

    private function resumeFor(User $user, array $skills, string $career = 'Backend Developer'): Resume
    {
        return Resume::create([
            'user_id'           => $user->id,
            'file_path'         => null,
            'extracted_text'    => implode(' ', $skills),
            'career_prediction' => $career,
            'resume_score'      => 75,
            'skills'            => $skills,
            'missing_skills'    => [],
        ]);
    }

    public function test_seeker_cannot_apply_to_external_listing(): void
    {
        $job = $this->job(['source' => 'wwr']);

        $this->actingAs($this->seeker(), 'api')
             ->postJson("/api/jobs/{$job->id}/apply")
             ->assertStatus(422);
    }

    public function test_seeker_cannot_apply_to_unmoderated_job(): void
    {
        $job = $this->job(['moderation_status' => 'pending']);

        $this->actingAs($this->seeker(), 'api')
             ->postJson("/api/jobs/{$job->id}/apply")
             ->assertStatus(404);
    }

    public function test_seeker_cannot_apply_after_deadline(): void
    {
        $job = $this->job(['application_deadline' => now()->subDay()->toDateString()]);

        $this->actingAs($this->seeker(), 'api')
             ->postJson("/api/jobs/{$job->id}/apply")
             ->assertStatus(422);
    }

    public function test_employers_and_admins_cannot_apply(): void
    {
        $job = $this->job();

        $this->actingAs($this->employer(), 'api')->postJson("/api/jobs/{$job->id}/apply")->assertStatus(403);
        $admin = User::factory()->create(['is_admin' => true, 'is_active' => true]);
        $this->actingAs($admin, 'api')->postJson("/api/jobs/{$job->id}/apply")->assertStatus(403);
    }

    public function test_application_attaches_latest_resume(): void
    {
        $seeker = $this->seeker();
        $this->resumeFor($seeker, ['python']);
        $latest = $this->resumeFor($seeker, ['php', 'laravel']);
        $job    = $this->job();

        $this->actingAs($seeker, 'api')->postJson("/api/jobs/{$job->id}/apply")->assertStatus(201);

        $this->assertSame($latest->id, JobApplication::first()->resume_id);
    }

    public function test_search_filters_and_flags(): void
    {
        $seeker = $this->seeker();
        $applied = $this->job(['title' => 'PHP Engineer', 'employment_type' => 'full-time']);
        $this->job(['title' => 'Design Intern', 'employment_type' => 'internship', 'required_skills' => ['figma']]);
        $this->job(['title' => 'Remote Python Role', 'source' => 'wwr']);

        $this->actingAs($seeker, 'api')->postJson("/api/jobs/{$applied->id}/apply")->assertStatus(201);

        $this->actingAs($seeker, 'api')->getJson('/api/jobs?employment_type=internship')
             ->assertJsonPath('total', 1)->assertJsonPath('jobs.0.title', 'Design Intern');

        $this->actingAs($seeker, 'api')->getJson('/api/jobs?source=external')
             ->assertJsonPath('total', 1)->assertJsonPath('jobs.0.source', 'wwr');

        $this->actingAs($seeker, 'api')->getJson('/api/jobs?q=figma')
             ->assertJsonPath('total', 1);

        $this->actingAs($seeker, 'api')->getJson('/api/jobs?q=PHP%20Engineer')
             ->assertJsonPath('jobs.0.applied', true);
    }

    public function test_recommended_jobs_rank_by_resume_skills(): void
    {
        $seeker = $this->seeker();
        $this->resumeFor($seeker, ['php', 'laravel', 'sql']);
        $this->job(['title' => 'Laravel Backend Developer']);
        $this->job(['title' => 'Data Analyst', 'required_skills' => ['python', 'sql', 'excel', 'tableau']]);
        $this->job(['title' => 'Graphic Designer', 'required_skills' => ['photoshop']]);

        $res = $this->actingAs($seeker, 'api')->getJson('/api/jobs/recommended')->assertOk();

        $this->assertSame('Laravel Backend Developer', $res->json('jobs.0.title'));
        $this->assertCount(2, $res->json('jobs'));
        $this->assertSame(['php', 'laravel', 'sql'], $res->json('jobs.0.matched_skills'));
    }

    public function test_recommended_jobs_empty_without_resume(): void
    {
        $this->job();

        $this->actingAs($this->seeker(), 'api')
             ->getJson('/api/jobs/recommended')
             ->assertOk()
             ->assertJsonPath('based_on', null)
             ->assertJsonCount(0, 'jobs');
    }

    public function test_cannot_save_hidden_job(): void
    {
        $job = $this->job(['moderation_status' => 'rejected']);

        $this->actingAs($this->seeker(), 'api')->postJson("/api/jobs/{$job->id}/save")->assertStatus(404);
    }

    public function test_job_detail_includes_company_profile_and_apply_flags(): void
    {
        $employer = $this->employer();
        $employer->companyProfile()->create(['company_name' => 'Acme Nepal', 'location' => 'Kathmandu']);
        $job = $this->job(['employer_id' => $employer->id]);

        $this->actingAs($this->seeker(), 'api')
             ->getJson("/api/jobs/{$job->id}")
             ->assertOk()
             ->assertJsonPath('company_profile.company_name', 'Acme Nepal')
             ->assertJsonPath('accepts_applications', true)
             ->assertJsonPath('deadline_passed', false)
             ->assertJsonMissingPath('employer');
    }

    public function test_employer_applicants_are_auto_scored_and_ranked(): void
    {
        Http::fake(['*/match' => fn ($request) => Http::response([
            'score'          => count($request['applicant_skills']) * 20,
            'matched_skills' => $request['applicant_skills'],
            'missing_skills' => [],
        ])]);

        $employer = $this->employer();
        $job      = $this->job(['employer_id' => $employer->id]);

        $weak   = $this->seeker();
        $strong = $this->seeker();
        $this->resumeFor($weak, ['php']);
        $this->resumeFor($strong, ['php', 'laravel', 'sql']);

        $this->actingAs($weak, 'api')->postJson("/api/jobs/{$job->id}/apply")->assertStatus(201);
        $this->actingAs($strong, 'api')->postJson("/api/jobs/{$job->id}/apply")->assertStatus(201);

        $res = $this->actingAs($employer, 'api')->getJson("/api/employer/jobs/{$job->id}/applicants")->assertOk();

        $this->assertSame($strong->id, $res->json('applicants.0.user.id'));
        $this->assertEquals(60, $res->json('applicants.0.ai_match_score'));
        $this->assertSame(1, $res->json('applicants.0.rank'));
        $this->assertSame(2, $res->json('applicants.1.rank'));
        $this->assertSame('Backend Developer', $res->json('applicants.0.resume.career_prediction'));
    }

    public function test_scoring_falls_back_to_local_overlap_when_ai_is_down(): void
    {
        Http::fake(['*' => Http::response([], 500)]);

        $employer = $this->employer();
        $job      = $this->job(['employer_id' => $employer->id]);
        $seeker   = $this->seeker();
        $this->resumeFor($seeker, ['php', 'laravel']);

        $this->actingAs($seeker, 'api')->postJson("/api/jobs/{$job->id}/apply")->assertStatus(201);

        $this->actingAs($employer, 'api')
             ->getJson("/api/employer/jobs/{$job->id}/applicants")
             ->assertJsonPath('applicants.0.ai_match_score', 50)
             ->assertJsonPath('applicants.0.missing_skills', ['sql', 'docker']);
    }

    public function test_employer_cannot_view_other_employers_applicants(): void
    {
        $job = $this->job(['employer_id' => $this->employer()->id]);

        $this->actingAs($this->employer(), 'api')
             ->getJson("/api/employer/jobs/{$job->id}/applicants")
             ->assertStatus(404);
    }

    public function test_status_update_is_visible_to_seeker(): void
    {
        Http::fake(['*' => Http::response([], 500)]);

        $employer = $this->employer();
        $job      = $this->job(['employer_id' => $employer->id]);
        $seeker   = $this->seeker();

        $this->actingAs($seeker, 'api')->postJson("/api/jobs/{$job->id}/apply")->assertStatus(201);
        $application = JobApplication::first();

        $this->actingAs($employer, 'api')
             ->patchJson("/api/employer/jobs/{$job->id}/applicants/{$application->id}/status", ['status' => 'interview'])
             ->assertOk();

        $this->actingAs($seeker, 'api')
             ->getJson('/api/applications')
             ->assertJsonPath('0.status', 'interview');
    }

    public function test_applicant_resume_download_requires_file(): void
    {
        $employer = $this->employer();
        $job      = $this->job(['employer_id' => $employer->id]);
        $seeker   = $this->seeker();
        $this->resumeFor($seeker, ['php']);

        $this->actingAs($seeker, 'api')->postJson("/api/jobs/{$job->id}/apply")->assertStatus(201);
        $application = JobApplication::first();

        $this->actingAs($employer, 'api')
             ->get("/api/employer/jobs/{$job->id}/applicants/{$application->id}/resume")
             ->assertStatus(404);
    }

    public function test_editing_approved_job_sends_it_back_to_moderation(): void
    {
        $employer = $this->employer();
        $job      = $this->job(['employer_id' => $employer->id]);

        $this->actingAs($employer, 'api')
             ->patchJson("/api/employer/jobs/{$job->id}", ['title' => 'Senior Laravel Developer'])
             ->assertOk()
             ->assertJsonPath('moderation_status', 'pending');

        $this->actingAs($employer, 'api')
             ->patchJson("/api/employer/jobs/{$job->id}/close")
             ->assertOk();

        $this->assertFalse($job->fresh()->is_active);
    }

    public function test_company_profile_name_flows_to_posted_jobs(): void
    {
        $employer = $this->employer();
        $job      = $this->job(['employer_id' => $employer->id, 'company' => 'Old Name']);

        $this->actingAs($employer, 'api')
             ->postJson('/api/employer/profile', ['company_name' => 'New Name'])
             ->assertStatus(201);

        $this->assertSame('New Name', $job->fresh()->company);

        $this->actingAs($employer->fresh(), 'api')
             ->patchJson('/api/employer/profile', ['company_name' => 'Newer Name'])
             ->assertOk();

        $this->assertSame('Newer Name', $job->fresh()->company);
    }

    public function test_analysis_is_stored_and_viewable(): void
    {
        Http::fake(['*/analyze' => Http::response([
            'match_percentage'    => 40,
            'ml_predicted_career' => 'Backend Developer',
            'resume_score'        => 80,
            'extracted_skills'    => ['php'],
            'missing_skills'      => ['sql'],
            'recommended_courses' => ['Laravel Masterclass'],
        ])]);

        $seeker = $this->seeker();

        $this->actingAs($seeker, 'api')
             ->postJson('/api/resume/analyze', ['resume' => 'php developer', 'job' => 'php role'])
             ->assertOk();

        $resume = Resume::first();

        $this->actingAs($seeker, 'api')
             ->getJson("/api/resume/{$resume->id}")
             ->assertOk()
             ->assertJsonPath('analysis.recommended_courses.0', 'Laravel Masterclass')
             ->assertJsonMissingPath('extracted_text');

        $this->actingAs($this->seeker(), 'api')->getJson("/api/resume/{$resume->id}")->assertStatus(404);
    }
}
