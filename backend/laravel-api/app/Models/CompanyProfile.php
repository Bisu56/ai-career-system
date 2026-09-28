<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanyProfile extends Model
{
    protected $fillable = [
        'user_id',
        'company_name',
        'description',
        'location',
        'website',
        'contact_email',
        'logo_path',
    ];

    protected static function booted(): void
    {
        static::saved(function (CompanyProfile $profile) {
            if ($profile->wasChanged('company_name') || $profile->wasRecentlyCreated) {
                JobListing::where('employer_id', $profile->user_id)->update(['company' => $profile->company_name]);
            }
        });
    }

    public function employer()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
