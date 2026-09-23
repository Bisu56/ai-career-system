<?php

namespace Tests\Feature;

use App\Models\JobListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobApplicationTest extends TestCase
{
    use RefreshDatabase;

    private function user(): User
    {
        return User::factory()->create();
    }

    private function job(array $attrs = []): JobListing
    {
        return JobListing::create(array_merge([
            'source'      => 'test',
            'external_id' => uniqid('job_'),
            'title'       => 'Software Engineer',
            'company'     => 'Acme Corp',
            'url'         => 'https://example.com/job/1',
            'is_active'   => true,
        ], $attrs));
    }

    // ── Authentication guard ───────────────────────────────────────────

    public function test_apply_requires_authentication(): void
    {
        $job = $this->job();
        $this->postJson("/api/jobs/{$job->id}/apply")
             ->assertStatus(401);
    }

    public function test_list_applications_requires_authentication(): void
    {
        $this->getJson('/api/applications')->assertStatus(401);
    }

    // ── Happy path ─────────────────────────────────────────────────────

    public function test_user_can_apply_to_active_job(): void
    {
        $user = $this->user();
        $job  = $this->job();

        $res = $this->actingAs($user, 'api')
                    ->postJson("/api/jobs/{$job->id}/apply", [
                        'cover_letter' => 'I am a great fit.',
                    ]);

        $res->assertStatus(201)
            ->assertJsonFragment(['status' => 'applied'])
            ->assertJsonFragment(['title' => 'Software Engineer']);
    }

    public function test_user_can_list_own_applications(): void
    {
        $user = $this->user();
        $job  = $this->job();

        $this->actingAs($user, 'api')
             ->postJson("/api/jobs/{$job->id}/apply");

        $res = $this->actingAs($user, 'api')
                    ->getJson('/api/applications');

        $res->assertStatus(200)
            ->assertJsonCount(1);
    }

    public function test_application_summary_returns_counts(): void
    {
        $user = $this->user();
        $job  = $this->job();

        $this->actingAs($user, 'api')
             ->postJson("/api/jobs/{$job->id}/apply");

        $res = $this->actingAs($user, 'api')
                    ->getJson('/api/applications/summary');

        $res->assertStatus(200)
            ->assertJsonFragment(['total' => 1]);
    }

    // ── Business rules ─────────────────────────────────────────────────

    public function test_duplicate_application_is_rejected(): void
    {
        $user = $this->user();
        $job  = $this->job();

        $this->actingAs($user, 'api')->postJson("/api/jobs/{$job->id}/apply");

        $this->actingAs($user, 'api')
             ->postJson("/api/jobs/{$job->id}/apply")
             ->assertStatus(409);
    }

    public function test_cannot_apply_to_closed_job(): void
    {
        $user = $this->user();
        $job  = $this->job(['is_active' => false]);

        $this->actingAs($user, 'api')
             ->postJson("/api/jobs/{$job->id}/apply")
             ->assertStatus(422)
             ->assertJsonFragment(['error' => 'This job is no longer accepting applications.']);
    }

    public function test_user_can_withdraw_application(): void
    {
        $user = $this->user();
        $job  = $this->job();

        $apply = $this->actingAs($user, 'api')
                      ->postJson("/api/jobs/{$job->id}/apply");

        $appId = $apply->json('id');

        $this->actingAs($user, 'api')
             ->patchJson("/api/applications/{$appId}/withdraw")
             ->assertStatus(200)
             ->assertJsonFragment(['status' => 'withdrawn']);
    }

    public function test_user_cannot_see_another_users_application(): void
    {
        $userA = $this->user();
        $userB = $this->user();
        $job   = $this->job();

        $apply = $this->actingAs($userA, 'api')
                      ->postJson("/api/jobs/{$job->id}/apply");

        $appId = $apply->json('id');

        $this->actingAs($userB, 'api')
             ->getJson("/api/applications/{$appId}")
             ->assertStatus(404);
    }

    public function test_user_cannot_withdraw_another_users_application(): void
    {
        $userA = $this->user();
        $userB = $this->user();
        $job   = $this->job();

        $apply = $this->actingAs($userA, 'api')
                      ->postJson("/api/jobs/{$job->id}/apply");

        $appId = $apply->json('id');

        $this->actingAs($userB, 'api')
             ->patchJson("/api/applications/{$appId}/withdraw")
             ->assertStatus(404);
    }
}
