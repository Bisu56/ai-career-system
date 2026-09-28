<?php

use App\Models\User;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('admin:create {email} {--name=Administrator} {--password=}', function () {
    $password = $this->option('password') ?: $this->secret('Password (min 8 chars, 1 uppercase, 1 number)');

    if (strlen($password) < 8 || !preg_match('/[A-Z]/', $password) || !preg_match('/[0-9]/', $password)) {
        $this->error('Password must be at least 8 characters with one uppercase letter and one number.');
        return 1;
    }

    $user = User::updateOrCreate(
        ['email' => $this->argument('email')],
        [
            'name'            => $this->option('name'),
            'password'        => $password,
            'is_admin'        => true,
            'is_employer'     => false,
            'employer_status' => 'approved',
            'is_active'       => true,
        ]
    );

    $this->info("Admin account ready: {$user->email}");
    return 0;
})->purpose('Create an admin account or promote an existing user to admin');
