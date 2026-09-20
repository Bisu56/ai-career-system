<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobListing extends Model
{
    protected $fillable = [
        'source', 'external_id', 'title', 'company', 'url', 'location', 'skills', 'posted_at',
    ];

    protected $casts = [
        'skills' => 'array',
        'posted_at' => 'datetime',
    ];

    public function savedByUsers()
    {
        return $this->belongsToMany(User::class, 'saved_jobs')->withTimestamps();
    }
}
