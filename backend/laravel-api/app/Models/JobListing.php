<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobListing extends Model
{
    protected $fillable = [
        'source', 'external_id', 'title', 'company', 'url',
        'location', 'skills', 'posted_at', 'is_active', 'description',
    ];

    protected $casts = [
        'skills'    => 'array',
        'posted_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function savedByUsers()
    {
        return $this->belongsToMany(User::class, 'saved_jobs')->withTimestamps();
    }

    public function applications()
    {
        return $this->hasMany(JobApplication::class);
    }
}
