<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Resume extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'file_path',
        'extracted_text',
        'match_percentage',
        'career_prediction',
        'resume_score',
        'skills',
        'missing_skills'
    ];

    protected $casts = [
        'skills' => 'array',
        'missing_skills' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
