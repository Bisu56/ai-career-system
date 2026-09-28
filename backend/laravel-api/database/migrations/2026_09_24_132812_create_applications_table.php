<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // The resume sent with this application. Kept even if the seeker
            // later deletes it, so the employer still sees what they applied with.
            $table->foreignId('resume_id')->nullable()->constrained()->nullOnDelete();
            $table->text('cover_note')->nullable();
            // applied | reviewed | shortlisted | rejected | hired
            $table->string('status')->default('applied');
            // Scored once at apply time so the employer's list is stable and
            // doesn't re-rank because the seeker edited their resume later.
            $table->float('match_percentage')->default(0);
            $table->json('matched_skills')->nullable();
            $table->json('missing_skills')->nullable();
            $table->timestamp('status_changed_at')->nullable();
            $table->timestamps();

            // One application per job per seeker.
            $table->unique(['job_post_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};
