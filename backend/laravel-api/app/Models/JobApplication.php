<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobApplication extends Model
{
    protected $fillable = [
        'user_id',
        'job_listing_id',
        'status',
        'cover_letter',
        'ai_match_score',
        'matched_skills',
        'missing_skills',
    ];

    protected $casts = [
        'created_at'     => 'datetime',
        'updated_at'     => 'datetime',
        'ai_match_score' => 'float',
        'matched_skills' => 'array',
        'missing_skills' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function job()
    {
        return $this->belongsTo(JobListing::class, 'job_listing_id');
    }
}
