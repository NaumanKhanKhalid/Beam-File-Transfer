<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $fillable = [
        'name', 'email', 'password', 'plan', 'is_admin', 'google_id', 'avatar_url',
        'brand_enabled', 'brand_name', 'brand_accent', 'brand_logo_path',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'password'      => 'hashed',
            'email_verified_at' => 'datetime',
            'is_admin'      => 'boolean',
            'brand_enabled' => 'boolean',
        ];
    }

    public function transfers(): HasMany
    {
        return $this->hasMany(Transfer::class);
    }

    public function subscription(): HasOne
    {
        return $this->hasOne(Subscription::class)->latestOfMany();
    }

    public function isPro(): bool
    {
        return in_array($this->plan, ['pro', 'business'], true);
    }

    /** Public URL for the profile photo: absolute (Google) or a stored upload. */
    public function avatarUrl(): ?string
    {
        if (! $this->avatar_url) return null;
        return str_starts_with($this->avatar_url, 'http')
            ? $this->avatar_url
            : asset('storage/' . $this->avatar_url);
    }
}
