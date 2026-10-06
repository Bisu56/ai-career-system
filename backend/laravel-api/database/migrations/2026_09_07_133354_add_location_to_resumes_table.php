<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            // The candidate's own city, parsed from the resume's contact block.
            $table->string('location')->nullable()->after('career_prediction');
        });
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->dropColumn('location');
        });
    }
};
