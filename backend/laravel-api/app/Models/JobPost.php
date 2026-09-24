<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobPost extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'user_id',
        'title',
        'description',
        'location',
        'is_remote',
        'job_type',
        'salary',
        'skills',
        'status',
        'moderation_status',
        'moderation_note',
        'closes_at',
    ];

    protected $casts = [
        'skills' => 'array',
        'is_remote' => 'boolean',
        'closes_at' => 'datetime',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function employer()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function applications()
    {
        return $this->hasMany(Application::class);
    }

    /**
     * What a job seeker is allowed to see: approved by an admin, still open,
     * and not past its closing date.
     */
    public function scopeVisible(Builder $query): Builder
    {
        return $query->where('moderation_status', 'approved')
            ->where('status', 'open')
            ->where(fn ($q) => $q->whereNull('closes_at')->orWhere('closes_at', '>=', now()));
    }

    public function isAcceptingApplications(): bool
    {
        return $this->moderation_status === 'approved'
            && $this->status === 'open'
            && (! $this->closes_at || $this->closes_at->isFuture());
    }
}
