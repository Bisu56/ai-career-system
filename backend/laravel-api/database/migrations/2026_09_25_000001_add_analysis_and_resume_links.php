<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->string('original_name')->nullable()->after('file_path');
            $table->json('analysis')->nullable()->after('missing_skills');
        });

        Schema::table('job_applications', function (Blueprint $table) {
            $table->foreignId('resume_id')->nullable()->after('job_listing_id')
                  ->constrained('resumes')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('job_applications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('resume_id');
        });

        Schema::table('resumes', function (Blueprint $table) {
            $table->dropColumn(['original_name', 'analysis']);
        });
    }
};
