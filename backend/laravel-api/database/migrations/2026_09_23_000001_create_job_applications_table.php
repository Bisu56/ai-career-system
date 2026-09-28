<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add is_active flag and description to job_listings so we can guard
        // against applying to closed jobs, and show details in the UI.
        Schema::table('job_listings', function (Blueprint $table) {
            $table->boolean('is_active')->default(true)->after('posted_at');
            $table->text('description')->nullable()->after('location');
        });

        Schema::create('job_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('job_listing_id')->constrained()->cascadeOnDelete();
            // Prevent duplicate applications
            $table->unique(['user_id', 'job_listing_id']);
            $table->enum('status', [
                'applied',
                'shortlisted',
                'interview',
                'selected',
                'rejected',
                'withdrawn',
            ])->default('applied');
            $table->text('cover_letter')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_applications');

        Schema::table('job_listings', function (Blueprint $table) {
            $table->dropColumn(['is_active', 'description']);
        });
    }
};
