<?php

namespace Tests\Feature;

use App\Models\JobListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AdminPanelTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['is_admin' => true, 'is_active' => true]);
    }

    private function seeker(): User
    {
        return User::factory()->create(['is_active' => true]);
    }

    private function employer(string $status = 'pending'): User
    {
        return User::factory()->create([
            'is_employer'     => true,
            'employer_status' => $status,
            'is_active'       => true,
        ]);
    }

    private function employerJob(User $employer, array $attrs = []): JobListing
    {
        return JobListing::create(array_merge([
            'employer_id'       => $employer->id,
            'source'            => 'employer',
            'external_id'       => uniqid('emp_'),
            'title'             => 'Laravel Developer',
            'company'           => 'Acme',
            'url'               => 'http://localhost',
            'is_active'         => true,
            'moderation_status' => 'pending',
        ], $attrs));
    }

    public function test_admin_endpoints_are_forbidden_for_non_admins(): void
    {
        $seeker = $this->seeker();

        foreach (['/api/admin/dashboard', '/api/admin/users', '/api/admin/employers', '/api/admin/jobs', '/api/admin/feed'] as $url) {
            $this->actingAs($seeker, 'api')->getJson($url)->assertStatus(403);
        }
    }

    public function test_dashboard_returns_counts_and_breakdowns(): void
    {
        $this->employer();

        $this->actingAs($this->admin(), 'api')
             ->getJson('/api/admin/dashboard')
             ->assertOk()
             ->assertJsonPath('pending_employers', 1)
             ->assertJsonStructure(['career_distribution', 'jobs_by_source', 'recent_analyses', 'recent_applications']);
    }

    public function test_admin_can_approve_employer_who_can_then_post_jobs(): void
    {
        $admin    = $this->admin();
        $employer = $this->employer('pending');

        $this->actingAs($employer, 'api')
             ->postJson('/api/employer/jobs', ['title' => 'Dev', 'description' => 'Build things'])
             ->assertStatus(403);

        $this->actingAs($admin, 'api')
             ->patchJson("/api/admin/employers/{$employer->id}/approve")
             ->assertOk();

        $this->assertSame('approved', $employer->fresh()->employer_status);

        $this->actingAs($employer->fresh(), 'api')
             ->postJson('/api/employer/jobs', ['title' => 'Dev', 'description' => 'Build things'])
             ->assertStatus(201)
             ->assertJsonPath('moderation_status', 'pending');
    }

    public function test_admin_can_reject_employer(): void
    {
        $employer = $this->employer('pending');

        $this->actingAs($this->admin(), 'api')
             ->patchJson("/api/admin/employers/{$employer->id}/reject")
             ->assertOk();

        $this->actingAs($employer->fresh(), 'api')
             ->getJson('/api/employer/jobs')
             ->assertStatus(403)
             ->assertJsonPath('employer_status', 'rejected');
    }

    public function test_employers_list_filters_by_status_and_search(): void
    {
        $this->employer('pending')->update(['name' => 'Pending Co Owner']);
        $this->employer('approved');

        $this->actingAs($this->admin(), 'api')
             ->getJson('/api/admin/employers?status=pending&search=Pending')
             ->assertOk()
             ->assertJsonPath('total', 1)
             ->assertJsonPath('data.0.name', 'Pending Co Owner');
    }

    public function test_job_moderation_controls_seeker_visibility(): void
    {
        $admin  = $this->admin();
        $seeker = $this->seeker();
        $job    = $this->employerJob($this->employer('approved'));

        $this->actingAs($seeker, 'api')->getJson('/api/jobs')->assertJsonPath('total', 0);
        $this->actingAs($seeker, 'api')->getJson("/api/jobs/{$job->id}")->assertStatus(404);

        $this->actingAs($admin, 'api')->patchJson("/api/admin/jobs/{$job->id}/approve")->assertOk();
        $this->actingAs($seeker, 'api')->getJson('/api/jobs')->assertJsonPath('total', 1);

        $this->actingAs($admin, 'api')->patchJson("/api/admin/jobs/{$job->id}/reject")->assertOk();
        $this->actingAs($seeker, 'api')->getJson('/api/jobs')->assertJsonPath('total', 0);
    }

    public function test_admin_jobs_filter_by_status_and_source(): void
    {
        $this->employerJob($this->employer('approved'));
        JobListing::create([
            'source' => 'wwr', 'external_id' => 'wwr-1', 'title' => 'Remote Python Dev',
            'company' => 'Remote Co', 'url' => 'https://example.com',
        ]);

        $admin = $this->admin();
        $this->actingAs($admin, 'api')->getJson('/api/admin/jobs?status=pending')->assertJsonPath('total', 1);
        $this->actingAs($admin, 'api')->getJson('/api/admin/jobs?source=external')->assertJsonPath('total', 1)
             ->assertJsonPath('data.0.source', 'wwr');
    }

    public function test_admin_can_delete_job(): void
    {
        $job = $this->employerJob($this->employer('approved'));

        $this->actingAs($this->admin(), 'api')->deleteJson("/api/admin/jobs/{$job->id}")->assertOk();
        $this->assertDatabaseMissing('job_listings', ['id' => $job->id]);
    }

    public function test_deactivated_user_is_locked_out(): void
    {
        $admin  = $this->admin();
        $seeker = User::factory()->create(['is_active' => true, 'password' => 'Secret123']);

        $this->actingAs($admin, 'api')->patchJson("/api/admin/users/{$seeker->id}/deactivate")->assertOk();

        $this->postJson('/api/login', ['email' => $seeker->email, 'password' => 'Secret123'])
             ->assertStatus(403);

        $this->actingAs($seeker->fresh(), 'api')->getJson('/api/me')->assertStatus(401);

        $this->actingAs($admin, 'api')->patchJson("/api/admin/users/{$seeker->id}/activate")->assertOk();
        $this->postJson('/api/login', ['email' => $seeker->email, 'password' => 'Secret123'])->assertOk();
    }

    public function test_admin_cannot_deactivate_or_demote_self(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin, 'api')->patchJson("/api/admin/users/{$admin->id}/deactivate")->assertStatus(422);
        $this->actingAs($admin, 'api')->patchJson("/api/admin/users/{$admin->id}", ['is_admin' => false])->assertStatus(422);
        $this->actingAs($admin, 'api')->deleteJson("/api/admin/users/{$admin->id}")->assertStatus(422);
    }

    public function test_users_list_filters_by_role_and_status(): void
    {
        $admin = $this->admin();
        $this->employer('approved');
        $this->seeker()->update(['is_active' => false]);

        $this->actingAs($admin, 'api')->getJson('/api/admin/users?role=employer')->assertJsonPath('total', 1);
        $this->actingAs($admin, 'api')->getJson('/api/admin/users?status=inactive')->assertJsonPath('total', 1);
        $this->actingAs($admin, 'api')->getJson('/api/admin/users?role=admin')->assertJsonPath('total', 1);
    }

    public function test_refresh_feed_imports_external_jobs_and_protects_employer_jobs(): void
    {
        $employerJob = $this->employerJob($this->employer('approved'), ['external_id' => 'dup-1']);

        Http::fake([
            '*/jobs/feed*' => Http::response(['jobs' => [
                ['source' => 'wwr', 'external_id' => 'wwr-a', 'title' => 'Python Dev', 'company' => 'A', 'url' => 'https://a.test'],
                ['source' => 'wwr', 'external_id' => 'dup-1', 'title' => 'Hijack', 'company' => 'B', 'url' => 'https://b.test'],
                ['source' => 'wwr', 'external_id' => '', 'title' => 'Broken'],
            ]]),
        ]);

        $this->actingAs($this->admin(), 'api')
             ->postJson('/api/admin/jobs/refresh', ['keyword' => 'python', 'limit' => 10])
             ->assertOk()
             ->assertJsonPath('imported', 1)
             ->assertJsonPath('skipped', 2)
             ->assertJsonPath('total_external', 1);

        $this->assertSame('Laravel Developer', $employerJob->fresh()->title);
        $this->assertDatabaseHas('job_listings', ['external_id' => 'wwr-a', 'moderation_status' => 'approved']);
    }

    public function test_refresh_feed_reports_ai_service_failure(): void
    {
        Http::fake(['*/jobs/feed*' => Http::response([], 500)]);

        $this->actingAs($this->admin(), 'api')
             ->postJson('/api/admin/jobs/refresh')
             ->assertStatus(502)
             ->assertJsonPath('imported', 0);
    }

    public function test_feed_status_groups_external_jobs_by_source(): void
    {
        Http::fake(['*/jobs/sources' => Http::response(['adzuna_enabled' => true])]);

        JobListing::create(['source' => 'wwr', 'external_id' => 'w1', 'title' => 'A', 'company' => 'A', 'url' => 'https://a.test']);
        JobListing::create(['source' => 'wwr', 'external_id' => 'w2', 'title' => 'B', 'company' => 'B', 'url' => 'https://b.test']);
        JobListing::create(['source' => 'remoteok', 'external_id' => 'r1', 'title' => 'C', 'company' => 'C', 'url' => 'https://c.test']);

        $this->actingAs($this->admin(), 'api')
             ->getJson('/api/admin/feed')
             ->assertOk()
             ->assertJsonPath('total_external', 3)
             ->assertJsonPath('adzuna_enabled', true)
             ->assertJsonCount(2, 'sources');
    }
}
