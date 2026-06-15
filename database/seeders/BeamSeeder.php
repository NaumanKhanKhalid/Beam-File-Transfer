<?php

namespace Database\Seeders;

use App\Models\Subscription;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class BeamSeeder extends Seeder
{
    public function run(): void
    {
        // Admin login: admin@beam.to / password
        User::create([
            'name' => 'Beam Admin', 'email' => 'admin@beam.to',
            'password' => Hash::make('password'), 'plan' => 'business', 'is_admin' => true,
        ]);

        $seed = [
            ['Mara Lin',   'mara@studio.co',    'pro',      'active'],
            ['Theo Park',  'theo@parkfilms.io', 'business', 'active'],
            ['Ivy Cole',   'ivy@cole.design',   'pro',      'past_due'],
            ['Sam Reed',   'sam@reed.audio',    'free',     'active'],
            ['Nora Vance', 'nora@vance.co',     'pro',      'canceled'],
        ];

        foreach ($seed as [$name, $email, $plan, $status]) {
            $user = User::create([
                'name' => $name, 'email' => $email,
                'password' => Hash::make('password'), 'plan' => $plan,
            ]);

            if ($plan !== 'free') {
                Subscription::create([
                    'user_id' => $user->id,
                    'plan'    => $plan,
                    'status'  => $status,
                    'amount'  => $status === 'active' ? config("plans.$plan.yearly") : 0,
                    'current_period_end' => now()->addYear(),
                    'canceled_at' => $status === 'canceled' ? now() : null,
                ]);
            }
        }
    }
}
