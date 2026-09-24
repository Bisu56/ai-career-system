<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_listings', function (Blueprint $table) {
            // Nullable so existing externally-sourced listings aren't broken
            $table->foreignId('employer_id')->nullable()->after('id')
                  ->constrained('users')->nullOnDelete();

            // Rich job fields
            $table->json('required_skills')->nullable()->after('skills');
            $table->string('experience_level')->nullable()->after('required_skills'); // junior/mid/senior
            $table->string('education')->nullable()->after('experience_level');       // e.g. "Bachelor's"
            $table->string('employment_type')->nullable()->after('education');        // full-time/part-time/contract
            $table->string('salary_range')->nullable()->after('employment_type');     // e.g. "$60k – $80k"
            $table->date('application_deadline')->nullable()->after('salary_range');
        });
    }

    public function down(): void
    {
        Schema::table('job_listings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('employer_id');
            $table->dropColumn([
                'required_skills',
                'experience_level',
                'education',
                'employment_type',
                'salary_range',
                'application_deadline',
            ]);
        });
    }
};
