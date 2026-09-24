<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_applications', function (Blueprint $table) {
            $table->float('ai_match_score')->nullable()->after('cover_letter');
            $table->json('matched_skills')->nullable()->after('ai_match_score');
            $table->json('missing_skills')->nullable()->after('matched_skills');
        });
    }

    public function down(): void
    {
        Schema::table('job_applications', function (Blueprint $table) {
            $table->dropColumn(['ai_match_score', 'matched_skills', 'missing_skills']);
        });
    }
};
