<?php

namespace App\Models;

use App\Services\ApplicantScorer;
use Illuminate\Database\Eloquent\Model;

class JobApplication extends Model
{
    public const RESUME_SUMMARY = 'id,original_name,career_prediction,resume_score,created_at';

    protected static function booted(): void
    {
        static::created(function (JobApplication $application) {
            $id = $application->id;
            dispatch(function () use ($id) {
                $application = JobApplication::with(['user', 'resume', 'job'])->find($id);
                if ($application) {
                    app(ApplicantScorer::class)->scoreAndSave($application);
                }
            })->afterResponse();
        });
    }

    protected $fillable = [
        'user_id',
        'job_listing_id',
        'resume_id',
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

    public function resume()
    {
        return $this->belongsTo(Resume::class);
    }
}
