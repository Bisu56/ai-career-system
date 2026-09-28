<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

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
                     ->where('moderation_status', 'approved')
                     ->employerInGoodStanding();
    }

    public function scopeEmployerInGoodStanding($query)
    {
        return $query->where(function ($q) {
            $q->where('source', '!=', 'employer')
              ->orWhereHas('employer', fn ($e) => $e->where('employer_status', 'approved')->where('is_active', true));
        });
    }

    public static function localToday(): string
    {
        return now(config('app.local_timezone'))->toDateString();
    }

    /** Only jobs pending moderation review. */
    public function scopePendingModeration($query)
    {
        return $query->where('moderation_status', 'pending');
    }

    public function scopeExternal($query)
    {
        return $query->where('source', '!=', 'employer');
    }

    public function scopeFromSource($query, $source)
    {
        return match ($source) {
            'employer' => $query->where('source', 'employer'),
            'external' => $query->external(),
            default    => $query,
        };
    }

    protected $appends = ['accepts_applications'];

    public function getAcceptsApplicationsAttribute(): bool
    {
        return $this->acceptsApplications();
    }

    public function acceptsApplications(): bool
    {
        return $this->source === 'employer';
    }

    public function deadlinePassed(): bool
    {
        return $this->application_deadline !== null
            && self::localToday() > Carbon::parse($this->application_deadline)->toDateString();
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
