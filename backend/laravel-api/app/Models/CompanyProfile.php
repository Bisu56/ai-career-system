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

    public function employer()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
