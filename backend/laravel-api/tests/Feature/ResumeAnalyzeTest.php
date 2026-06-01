<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ResumeAnalyzeTest extends TestCase
{
    use RefreshDatabase;

    private function authToken(array $attrs = []): string
    {
        $user = User::create(array_merge([
            'name' => 'Test User',
            'email' => 'user@example.com',
            'password' => Hash::make('secret123'),
        ], $attrs));

        return auth('api')->login($user);
    }

    public function test_analyze_requires_authentication(): void
    {
        $this->postJson('/api/resume/analyze', [
            'resume' => 'Python developer',
            'job' => 'Python role',
        ])->assertStatus(401);
    }

    public function test_analyze_forwards_to_ai_service_and_returns_data(): void
    {
        // Mock the AI service so the test doesn't need it running.
        Http::fake([
            '127.0.0.1:8001/analyze' => Http::response([
                'match_percentage' => 42.5,
                'ml_predicted_career' => 'ML Engineer',
                'resume_score' => 80,
                'extracted_skills' => ['python', 'sql'],
                'missing_skills' => ['excel'],
            ], 200),
        ]);

        $token = $this->authToken();

        $response = $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/resume/analyze', [
                'resume' => 'Python developer with SQL experience',
                'job' => 'Looking for a Python developer',
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'ml_predicted_career' => 'ML Engineer',
                'match_percentage' => 42.5,
            ]);

        Http::assertSent(fn ($request) => $request->url() === 'http://127.0.0.1:8001/analyze');
    }

    public function test_analyze_validates_input(): void
    {
        $token = $this->authToken();

        $this->withHeader('Authorization', "Bearer $token")
            ->postJson('/api/resume/analyze', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['resume', 'job']);
    }

    public function test_admin_analytics_forbidden_for_regular_user(): void
    {
        $token = $this->authToken(['is_admin' => false]);

        $this->withHeader('Authorization', "Bearer $token")
            ->getJson('/api/admin/analytics')
            ->assertStatus(403);
    }

    public function test_admin_analytics_allowed_for_admin(): void
    {
        $token = $this->authToken([
            'email' => 'admin@example.com',
            'is_admin' => true,
        ]);

        $this->withHeader('Authorization', "Bearer $token")
            ->getJson('/api/admin/analytics')
            ->assertStatus(200)
            ->assertJsonStructure(['total_users', 'total_analyses', 'average_score']);
    }

    public function test_admin_analytics_requires_authentication(): void
    {
        $this->getJson('/api/admin/analytics')->assertStatus(401);
    }
}
