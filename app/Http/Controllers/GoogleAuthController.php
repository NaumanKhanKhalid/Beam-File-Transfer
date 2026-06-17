<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

/**
 * "Continue with Google" via Laravel Socialite.
 *
 *   GET /auth/google/redirect  → Socialite bounces the user to Google
 *   GET /auth/google/callback  → resolve the Google user, find/create the local
 *                                account, log them in (cookie session) and send
 *                                them into the app.
 *
 * Requires:  composer require laravel/socialite
 * Config:    services.google.{client_id,client_secret,redirect}  (.env.google.example)
 */
class GoogleAuthController extends Controller
{
    public function redirect()
    {
        if (! $this->configured()) {
            return redirect('/login?google=unconfigured');
        }

        return Socialite::driver('google')
            ->scopes(['openid', 'profile', 'email'])
            ->with(['prompt' => 'select_account'])
            ->redirect();
    }

    public function callback()
    {
        if (! $this->configured()) {
            return redirect('/login?google=unconfigured');
        }

        try {
            $g = Socialite::driver('google')->user();
        } catch (Throwable $e) {
            report($e);
            return redirect('/login?google=failed');
        }

        $email = $g->getEmail();
        // Only trust a Google-verified email (Socialite exposes the raw claim).
        if (! $email || (isset($g->user['email_verified']) && ! $g->user['email_verified'])) {
            return redirect('/login?google=email');
        }

        $user = User::where('google_id', $g->getId())->orWhere('email', $email)->first();
        if (! $user) {
            $user = User::create([
                'name'       => $g->getName() ?: Str::before($email, '@'),
                'email'      => $email,
                'password'   => Hash::make(Str::random(40)),   // OAuth users never type it
                'plan'       => 'free',
                'google_id'  => $g->getId(),
                'avatar_url' => $g->getAvatar(),
            ]);
            $user->forceFill(['email_verified_at' => now()])->save();
        } else {
            // Backfill the link / avatar; trust Google's verified email.
            $fill = [];
            if (! $user->google_id) $fill['google_id'] = $g->getId();
            if (! $user->avatar_url && $g->getAvatar()) $fill['avatar_url'] = $g->getAvatar();
            if (! $user->email_verified_at) $fill['email_verified_at'] = now();
            if ($fill) $user->forceFill($fill)->save();
        }

        // Log them in with a cookie session (same as email/password) and enter the app.
        Auth::login($user);
        request()->session()->regenerate();

        return redirect('/');
    }

    private function configured(): bool
    {
        return config('services.google.client_id') && config('services.google.client_secret');
    }
}
