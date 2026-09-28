<?php

namespace Database\Seeders;

use App\Models\JobListing;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        User::updateOrCreate(['email' => 'admin@careerai.local'], [
            'name'            => 'Site Admin',
            'password'        => 'Admin12345',
            'is_admin'        => true,
            'is_employer'     => false,
            'employer_status' => 'approved',
            'is_active'       => true,
        ]);

        User::updateOrCreate(['email' => 'seeker@careerai.local'], [
            'name'            => 'Demo Seeker',
            'password'        => 'Seeker12345',
            'is_employer'     => false,
            'employer_status' => 'approved',
            'is_active'       => true,
        ]);

        $employer = User::updateOrCreate(['email' => 'employer@careerai.local'], [
            'name'            => 'Demo Employer',
            'password'        => 'Employer12345',
            'is_employer'     => true,
            'employer_status' => 'approved',
            'is_active'       => true,
        ]);

        $employer->companyProfile()->updateOrCreate(['user_id' => $employer->id], [
            'company_name'  => 'Himalayan Tech Pvt. Ltd.',
            'description'   => 'A Kathmandu software studio building web platforms and data products for clients across South Asia.',
            'location'      => 'Kathmandu, Nepal',
            'website'       => 'https://example.com',
            'contact_email' => 'careers@example.com',
        ]);

        User::updateOrCreate(['email' => 'pending.employer@careerai.local'], [
            'name'            => 'Pending Employer',
            'password'        => 'Employer12345',
            'is_employer'     => true,
            'employer_status' => 'pending',
            'is_active'       => true,
        ]);

        $jobs = [
            [
                'title'            => 'Laravel Backend Developer',
                'description'      => "Build and maintain REST APIs in Laravel and PHP.\nDesign MySQL schemas, write tests, and ship features with the product team.",
                'required_skills'  => ['php', 'laravel', 'sql', 'git'],
                'experience_level' => 'mid',
                'education'        => "Bachelor's in Computer Science or related field",
                'employment_type'  => 'full-time',
                'salary_range'     => 'NPR 80,000 - 120,000 / month',
            ],
            [
                'title'            => 'Junior Data Analyst',
                'description'      => "Clean and analyse business data, build dashboards, and present findings to stakeholders.",
                'required_skills'  => ['python', 'sql', 'excel', 'data analysis'],
                'experience_level' => 'junior',
                'education'        => "Bachelor's in Statistics, Economics or Computer Science",
                'employment_type'  => 'full-time',
                'salary_range'     => 'NPR 50,000 - 70,000 / month',
            ],
            [
                'title'            => 'React Frontend Intern',
                'description'      => "Help build responsive interfaces in React for client dashboards.",
                'required_skills'  => ['javascript', 'react', 'html', 'css'],
                'experience_level' => 'entry',
                'education'        => 'Currently enrolled in a CS or IT degree',
                'employment_type'  => 'internship',
                'salary_range'     => 'NPR 15,000 / month',
            ],
        ];

        foreach ($jobs as $job) {
            JobListing::updateOrCreate(
                ['employer_id' => $employer->id, 'title' => $job['title']],
                array_merge($job, [
                    'company'              => 'Himalayan Tech Pvt. Ltd.',
                    'source'               => 'employer',
                    'external_id'          => 'emp-' . $employer->id . '-' . Str::uuid(),
                    'url'                  => config('app.url', 'http://localhost:8000'),
                    'location'             => 'Kathmandu, Nepal',
                    'application_deadline' => now()->addMonth()->toDateString(),
                    'is_active'            => true,
                    'posted_at'            => now(),
                    'moderation_status'    => 'approved',
                ])
            );
        }
    }
}
