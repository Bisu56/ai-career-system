<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->string('career_prediction')->nullable()->after('match_percentage');
            $table->integer('resume_score')->default(0)->after('career_prediction');
            $table->json('skills')->nullable()->after('resume_score');
            $table->json('missing_skills')->nullable()->after('skills');
        });
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->dropColumn(['career_prediction', 'resume_score', 'skills', 'missing_skills']);
        });
    }
};
