<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobListing extends Model
{
    protected $fillable = [
        'source',
        'external_id',
        'title',
        'company',
        'url',
        'location',
        'skills',
        'posted_at',
        'is_active',
        'description',
        // Employer-owned job fields
        'employer_id',
        'required_skills',
        'experience_level',
        'education',
        'employment_type',
        'salary_range',
        'application_deadline',
        // Moderation
        'moderation_status',  // pending | approved | rejected
    ];

    protected $casts = [
        'skills'          => 'array',
        'required_skills' => 'array',
        'posted_at'       => 'datetime',
        'is_active'       => 'boolean',
    ];

    // ── Scopes ─────────────────────────────────────────────────────────────────

    /** Only jobs that job seekers should see: is_active AND admin-approved. */
    public function scopeVisibleToSeekers($query)
    {
        return $query->where('is_active', true)
                     ->where('moderation_status', 'approved');
    }

    /** Only jobs pending moderation review. */
    public function scopePendingModeration($query)
    {
        return $query->where('moderation_status', 'pending');
    }

    // ── Relations ──────────────────────────────────────────────────────────────

    public function savedByUsers()
    {
        return $this->belongsToMany(User::class, 'saved_jobs')->withTimestamps();
    }

    public function applications()
    {
        return $this->hasMany(JobApplication::class);
    }

    public function employer()
    {
        return $this->belongsTo(User::class, 'employer_id');
    }
}
