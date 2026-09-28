<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jobs posted by employers on this site. Named job_posts because Laravel's
     * queue already owns the `jobs` table.
     */
    public function up(): void
    {
        Schema::create('job_posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description');
            $table->string('location')->nullable();
            $table->boolean('is_remote')->default(false);
            $table->string('job_type')->nullable();
            $table->string('salary')->nullable();
            // Skills the employer named, plus any the AI service found in the
            // description. Applicants are ranked against this list.
            $table->json('skills')->nullable();
            // The employer's own switch: a closed job stops taking applications.
            $table->string('status')->default('open');
            // The admin's switch, independent of the employer's: pending until
            // moderated, and only approved posts are visible to seekers.
            $table->string('moderation_status')->default('pending');
            $table->text('moderation_note')->nullable();
            $table->timestamp('closes_at')->nullable();
            $table->timestamps();

            $table->index(['moderation_status', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_posts');
    }
};
