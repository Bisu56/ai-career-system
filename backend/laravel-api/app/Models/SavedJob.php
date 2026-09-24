<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SavedJob extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'job_post_id',
        'external_id',
        'snapshot',
    ];

    protected $casts = [
        'snapshot' => 'array',
    ];

    public function jobPost()
    {
        return $this->belongsTo(JobPost::class);
    }
}
