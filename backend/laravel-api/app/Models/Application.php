<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Application extends Model
{
    use HasFactory;

    public const STATUSES = ['applied', 'reviewed', 'shortlisted', 'rejected', 'hired'];

    protected $fillable = [
        'job_post_id',
        'user_id',
        'resume_id',
        'cover_note',
        'status',
        'match_percentage',
        'matched_skills',
        'missing_skills',
        'status_changed_at',
    ];

    protected $casts = [
        'matched_skills' => 'array',
        'missing_skills' => 'array',
        'match_percentage' => 'float',
        'status_changed_at' => 'datetime',
    ];

    public function jobPost()
    {
        return $this->belongsTo(JobPost::class);
    }

    public function applicant()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function resume()
    {
        return $this->belongsTo(Resume::class);
    }
}
