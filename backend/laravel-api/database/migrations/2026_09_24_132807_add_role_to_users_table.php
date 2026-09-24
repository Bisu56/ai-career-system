<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // seeker | employer | admin. Existing rows are all job seekers.
            $table->string('role')->default('seeker')->after('password');
            // Employers need an admin to approve them before they can post.
            // Seekers and admins are approved on sight.
            $table->boolean('is_approved')->default(true)->after('role');
            $table->boolean('is_blocked')->default(false)->after('is_approved');
        });

        // Keep the existing is_admin flag authoritative for the accounts that
        // already have it, so nobody loses access on deploy.
        DB::table('users')->where('is_admin', true)->update(['role' => 'admin']);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'is_approved', 'is_blocked']);
        });
    }
};
