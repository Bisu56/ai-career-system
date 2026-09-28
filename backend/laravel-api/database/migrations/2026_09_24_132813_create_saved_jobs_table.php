<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A seeker's bookmarks. Covers both internal postings and listings from
     * the external feeds, which have no row of their own - for those the
     * listing itself is snapshotted so the bookmark survives the feed refresh.
     */
    public function up(): void
    {
        Schema::create('saved_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('job_post_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('external_id')->nullable();
            $table->json('snapshot')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'job_post_id']);
            $table->unique(['user_id', 'external_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_jobs');
    }
};
