<?php

namespace Tests\Feature;

use App\Models\JobApplication;
use App\Models\JobListing;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class HardeningTest extends TestCase
{
    use RefreshDatabase;

    private function seeker(): User
    {
        return User::factory()->create(['is_active' => true]);
    }

    private function employer(string $status = 'approved'): User
    {
        return User::factory()->create(['is_employer' => true, 'employer_status' => $status, 'is_active' => true]);
    }

    private function job(User $employer, array $attrs = []): JobListing
    {
        return JobListing::create(array_merge([
            'employer_id'       => $employer->id,
            'source'            => 'employer',
            'external_id'       => uniqid('job_'),
            'title'             => 'Backend Developer',
            'company'           => 'Acme',
            'url'               => 'http://localhost',
            'is_active'         => true,
            'moderation_status' => 'approved',
            'required_skills'   => ['php'],
        ], $attrs));
    }

    public function test_bad_ids_and_array_params_return_client_errors_not_500(): void
    {
        $seeker = $this->seeker();

        $this->actingAs($seeker, 'api')->getJson('/api/jobs/abc')->assertStatus(404);
        $this->actingAs($seeker, 'api')->getJson('/api/applications/abc')->assertStatus(404);
        $this->actingAs($seeker, 'api')->getJson('/api/jobs?q[]=x')->assertStatus(422);
        $this->actingAs($seeker, 'api')->getJson('/api/jobs?source[]=x')->assertStatus(422);

        $admin = User::factory()->create(['is_admin' => true, 'is_active' => true]);
        $this->actingAs($admin, 'api')->getJson('/api/admin/users?search[]=x')->assertStatus(422);
        $this->actingAs($admin, 'api')->getJson('/api/admin/jobs?q[]=x')->assertStatus(422);
        $this->actingAs($admin, 'api')->getJson('/api/admin/users?per_page=0')->assertOk()->assertJsonPath('per_page', 15);
    }

    public function test_search_wildcards_are_literal(): void
    {
        $employer = $this->employer();
        $this->job($employer, ['title' => 'Backend Developer']);
        $this->job($employer, ['title' => '100% Remote Designer', 'required_skills' => ['figma']]);

        $seeker = $this->seeker();
        $this->actingAs($seeker, 'api')->getJson('/api/jobs?q=%25')->assertJsonPath('total', 1);
        $this->actingAs($seeker, 'api')->getJson('/api/jobs?q=_')->assertJsonPath('total', 0);
        $this->actingAs($seeker, 'api')->getJson('/api/jobs?q=%22')->assertJsonPath('total', 0);
    }

    public function test_emails_are_case_insensitive(): void
    {
        $payload = ['name' => 'Asha', 'password' => 'Secret123', 'password_confirmation' => 'Secret123'];

        $this->postJson('/api/register', $payload + ['email' => 'Asha@Example.com'])->assertStatus(201);
        $this->postJson('/api/register', $payload + ['email' => 'asha@example.com'])->assertStatus(422);
        $this->postJson('/api/login', ['email' => 'ASHA@example.com', 'password' => 'Secret123'])->assertOk();
    }

    public function test_login_is_rate_limited(): void
    {
        User::factory()->create(['email' => 'target@example.com', 'is_active' => true]);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', ['email' => 'target@example.com', 'password' => 'Wrong1234'])->assertStatus(401);
        }

        $this->postJson('/api/login', ['email' => 'target@example.com', 'password' => 'Wrong1234'])->assertStatus(429);
    }

    public function test_token_can_be_refreshed(): void
    {
        $user  = User::factory()->create(['is_active' => true]);
        $token = auth('api')->login($user);

        $this->withHeader('Authorization', "Bearer {$token}")
             ->postJson('/api/refresh')
             ->assertOk()
             ->assertJsonStructure(['token', 'user']);
    }

    public function test_rejected_employer_loses_access_and_their_jobs_disappear(): void
    {
        $employer = $this->employer();
        $job      = $this->job($employer);
        $seeker   = $this->seeker();

        $this->actingAs($seeker, 'api')->postJson("/api/jobs/{$job->id}/apply")->assertStatus(201);

        $employer->update(['employer_status' => 'rejected']);

        $this->actingAs($employer->fresh(), 'api')->getJson("/api/employer/jobs/{$job->id}/applicants")->assertStatus(403);
        $this->actingAs($this->seeker(), 'api')->getJson('/api/jobs')->assertJsonPath('total', 0);
        $this->actingAs($this->seeker(), 'api')->postJson("/api/jobs/{$job->id}/apply")->assertStatus(404);
    }

    public function test_feed_refresh_keeps_admin_rejections(): void
    {
        $admin = User::factory()->create(['is_admin' => true, 'is_active' => true]);
        $feed  = ['jobs' => [[
            'source' => 'wwr', 'external_id' => 'wwr-x', 'title' => 'Scam Job', 'company' => 'X',
            'url' => 'https://x.test', 'posted_at' => 'not a date',
        ]]];
        Http::fake(['*/jobs/feed*' => Http::response($feed)]);

        $this->actingAs($admin, 'api')->postJson('/api/admin/jobs/refresh')->assertOk();
        $job = JobListing::where('external_id', 'wwr-x')->first();
        $this->assertNull($job->posted_at);

        $this->actingAs($admin, 'api')->patchJson("/api/admin/jobs/{$job->id}/reject")->assertOk();
        $this->actingAs($admin, 'api')->postJson('/api/admin/jobs/refresh')->assertOk();

        $this->assertSame('rejected', $job->fresh()->moderation_status);
        $this->actingAs($admin, 'api')->postJson('/api/admin/jobs/refresh', ['limit' => 0])->assertStatus(422);
    }

    public function test_job_edits_only_trigger_review_when_content_changes(): void
    {
        $employer = $this->employer();
        $job      = $this->job($employer, ['salary_range' => 'NPR 50,000']);

        $this->actingAs($employer, 'api')
             ->patchJson("/api/employer/jobs/{$job->id}", ['title' => 'Backend Developer', 'is_active' => true])
             ->assertOk()
             ->assertJsonPath('moderation_status', 'approved');

        $this->actingAs($employer, 'api')
             ->patchJson("/api/employer/jobs/{$job->id}", ['salary_range' => 'NPR 90,000'])
             ->assertJsonPath('moderation_status', 'pending');

        $job->update(['moderation_status' => 'rejected']);
        $this->actingAs($employer, 'api')
             ->patchJson("/api/employer/jobs/{$job->id}", ['title' => 'Senior Backend Developer'])
             ->assertJsonPath('moderation_status', 'pending');

        $this->actingAs($employer, 'api')
             ->patchJson("/api/employer/jobs/{$job->id}", ['application_deadline' => '2001-01-01'])
             ->assertStatus(422)
             ->assertJsonValidationErrors('application_deadline');

        $this->actingAs($employer, 'api')
             ->patchJson("/api/employer/jobs/{$job->id}", ['title' => '   '])
             ->assertStatus(422);
    }

    public function test_required_skills_are_normalised_and_validated(): void
    {
        $employer = $this->employer();

        $this->actingAs($employer, 'api')
             ->postJson('/api/employer/jobs', ['title' => 'Dev', 'description' => 'Build', 'required_skills' => ['PHP', ' php ', 'Laravel']])
             ->assertStatus(201)
             ->assertJsonPath('required_skills', ['php', 'laravel']);

        $this->actingAs($employer, 'api')
             ->postJson('/api/employer/jobs', ['title' => 'Dev', 'description' => 'Build', 'required_skills' => ['a' => 'php']])
             ->assertStatus(422);
    }

    public function test_jobs_with_applicants_cannot_be_deleted_by_employer(): void
    {
        $employer = $this->employer();
        $job      = $this->job($employer);
        $this->actingAs($this->seeker(), 'api')->postJson("/api/jobs/{$job->id}/apply")->assertStatus(201);

        $this->actingAs($employer, 'api')->deleteJson("/api/employer/jobs/{$job->id}")->assertStatus(422);
        $this->assertDatabaseHas('job_listings', ['id' => $job->id]);
    }

    public function test_application_prefers_uploaded_resume_over_pasted_text(): void
    {
        $seeker = $this->seeker();
        $upload = Resume::create(['user_id' => $seeker->id, 'file_path' => 'resumes/a.pdf', 'skills' => ['php'], 'resume_score' => 50]);
        Resume::create(['user_id' => $seeker->id, 'file_path' => null, 'skills' => ['excel'], 'resume_score' => 10]);

        $job = $this->job($this->employer());
        $this->actingAs($seeker, 'api')->postJson("/api/jobs/{$job->id}/apply")->assertStatus(201);

        $this->assertSame($upload->id, JobApplication::first()->resume_id);
    }

    public function test_failed_analysis_is_not_saved(): void
    {
        Http::fake(['*/analyze' => Http::response('<html>Bad gateway</html>', 502)]);
        $seeker = $this->seeker();

        $this->actingAs($seeker, 'api')
             ->postJson('/api/resume/analyze', ['resume' => 'php developer', 'job' => 'php role'])
             ->assertOk()
             ->assertJsonPath('analysis_failed', true);

        $this->assertSame(0, Resume::count());
    }

    public function test_decided_applications_cannot_go_back_to_applied(): void
    {
        $employer = $this->employer();
        $job      = $this->job($employer);
        $this->actingAs($this->seeker(), 'api')->postJson("/api/jobs/{$job->id}/apply")->assertStatus(201);
        $application = JobApplication::first();

        $this->actingAs($employer, 'api')
             ->patchJson("/api/employer/jobs/{$job->id}/applicants/{$application->id}/status", ['status' => 'selected'])
             ->assertOk();
        $this->actingAs($employer, 'api')
             ->patchJson("/api/employer/jobs/{$job->id}/applicants/{$application->id}/status", ['status' => 'applied'])
             ->assertStatus(422);
    }

    public function test_deadline_uses_local_timezone(): void
    {
        $this->travelTo(now('Asia/Kathmandu')->setTime(1, 0)->utc());
        $job = $this->job($this->employer(), ['application_deadline' => now('Asia/Kathmandu')->subDay()->toDateString()]);

        $this->assertTrue($job->deadlinePassed());
    }
}
