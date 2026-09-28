<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // ── users: employer approval status + account active flag ────────────
        Schema::table('users', function (Blueprint $table) {
            // pending | approved | rejected — only meaningful when is_employer=true
            $table->string('employer_status')->default('pending')->after('is_employer');
            // Admins can deactivate any account
            $table->boolean('is_active')->default(true)->after('employer_status');
        });

        // ── job_listings: moderation status ──────────────────────────────────
        Schema::table('job_listings', function (Blueprint $table) {
            // pending | approved | rejected
            // External (scraped) jobs are auto-approved; employer-posted jobs start pending
            $table->string('moderation_status')->default('approved')->after('is_active');
        });

        // Employer-posted jobs that already exist (source='employer') should be pending
        // All others (scraped) stay approved.
        DB::statement(
            "UPDATE job_listings SET moderation_status = 'pending' WHERE source = 'employer'"
        );
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['employer_status', 'is_active']);
        });

        Schema::table('job_listings', function (Blueprint $table) {
            $table->dropColumn('moderation_status');
        });
    }
};
