<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use HasFactory, Notifiable;

    public function getJWTIdentifier()   { return $this->getKey(); }
    public function getJWTCustomClaims() { return []; }

    protected $fillable = [
        'name',
        'email',
        'password',
        'is_admin',
        'is_employer',
        'employer_status',  // pending | approved | rejected
        'is_active',        // account active/deactivated flag
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'is_admin'          => 'boolean',
            'is_employer'       => 'boolean',
            'is_active'         => 'boolean',
        ];
    }

    protected function email(): Attribute
    {
        return Attribute::make(set: fn ($value) => strtolower(trim((string) $value)));
    }

    /** True only when user is an employer AND admin-approved. */
    public function isApprovedEmployer(): bool
    {
        return $this->is_employer && $this->employer_status === 'approved';
    }

    // ── Relations ──────────────────────────────────────────────────────────────

    public function savedJobs()
    {
        return $this->belongsToMany(JobListing::class, 'saved_jobs')->withTimestamps();
    }

    public function latestResume()
    {
        return $this->hasOne(Resume::class)->latestOfMany();
    }

    public function latestUploadedResume()
    {
        return $this->hasOne(Resume::class)->ofMany(['id' => 'max'], fn ($q) => $q->whereNotNull('file_path'));
    }

    public function applications()
    {
        return $this->hasMany(JobApplication::class);
    }

    public function companyProfile()
    {
        return $this->hasOne(CompanyProfile::class);
    }

    public function jobListings()
    {
        return $this->hasMany(JobListing::class, 'employer_id');
    }
}
