<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Resume extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'file_path',
        'original_name',
        'extracted_text',
        'match_percentage',
        'career_prediction',
        'resume_score',
        'skills',
        'missing_skills',
        'analysis'
    ];

    protected $hidden = ['extracted_text'];

    protected $casts = [
        'skills' => 'array',
        'missing_skills' => 'array',
        'analysis' => 'array',
    ];

    public function hasFile(): bool
    {
        return $this->file_path !== null && Storage::exists($this->file_path);
    }

    public function download()
    {
        return Storage::download($this->file_path, $this->original_name ?? 'resume.pdf');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
