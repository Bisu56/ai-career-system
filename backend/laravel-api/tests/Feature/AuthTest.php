<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_creates_user_and_returns_token(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Alice',
            'email' => 'alice@example.com',
            'password' => 'Secret123',
            'password_confirmation' => 'Secret123',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['message', 'token', 'user' => ['id', 'name', 'email']]);

        $this->assertDatabaseHas('users', ['email' => 'alice@example.com']);
    }

    public function test_register_rejects_duplicate_email(): void
    {
        User::create([
            'name' => 'Existing',
            'email' => 'dup@example.com',
            'password' => Hash::make('Secret123'),
        ]);

        $response = $this->postJson('/api/register', [
            'name' => 'Another',
            'email' => 'dup@example.com',
            'password' => 'Secret123',
            'password_confirmation' => 'Secret123',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_register_validates_required_fields(): void
    {
        $response = $this->postJson('/api/register', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_register_rejects_weak_password(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test',
            'email' => 'test@example.com',
            'password' => 'weakpass',
            'password_confirmation' => 'weakpass',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_register_rejects_unconfirmed_password(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Test',
            'email' => 'test@example.com',
            'password' => 'Secret123',
            'password_confirmation' => 'Different1',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_login_succeeds_with_correct_credentials(): void
    {
        User::create([
            'name' => 'Bob',
            'email' => 'bob@example.com',
            'password' => Hash::make('Secret123'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'bob@example.com',
            'password' => 'Secret123',
        ]);

        $response->assertStatus(200)->assertJsonStructure(['token', 'user']);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        User::create([
            'name' => 'Bob',
            'email' => 'bob@example.com',
            'password' => Hash::make('Secret123'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'bob@example.com',
            'password' => 'wrongpass',
        ]);

        $response->assertStatus(401);
    }

    public function test_me_requires_authentication(): void
    {
        $this->getJson('/api/me')->assertStatus(401);
    }

    public function test_me_returns_authenticated_user(): void
    {
        $user = User::create([
            'name' => 'Carol',
            'email' => 'carol@example.com',
            'password' => Hash::make('Secret123'),
        ]);

        $token = auth('api')->login($user);

        $this->withHeader('Authorization', "Bearer $token")
            ->getJson('/api/me')
            ->assertStatus(200)
            ->assertJsonFragment(['email' => 'carol@example.com']);
    }
}
