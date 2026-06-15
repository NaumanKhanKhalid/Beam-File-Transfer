<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Transfer extends Model
{
    protected $fillable = [
        'user_id', 'slug', 'title', 'message', 'sender_name', 'sender_ip', 'recipients',
        'password_hash', 'burn_after_download', 'notify_on_download',
        'total_bytes', 'download_count', 'expires_at', 'burned_at', 'brand',
    ];

    protected $hidden = ['password_hash', 'sender_ip'];

    protected function casts(): array
    {
        return [
            'recipients'          => 'array',
            'brand'               => 'array',
            'burn_after_download' => 'boolean',
            'notify_on_download'  => 'boolean',
            'expires_at'          => 'datetime',
            'burned_at'           => 'datetime',
        ];
    }

    public function files(): HasMany
    {
        return $this->hasMany(TransferFile::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Generate a short, URL-safe public slug like "4k2-9zq-mara". */
    public static function makeSlug(?string $hint = null): string
    {
        $base = Str::lower(Str::random(3) . '-' . Str::random(3) . '-' . Str::random(3));
        if ($hint) {
            $base .= '-' . Str::slug(Str::limit($hint, 12, ''));
        }
        return $base;
    }

    public function isProtected(): bool
    {
        return ! is_null($this->password_hash);
    }

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function isBurned(): bool
    {
        return ! is_null($this->burned_at);
    }

    /**
     * Resolve an expiry token to a concrete timestamp, clamped to the plan's max.
     * Shared by the single-POST and chunked upload flows.
     */
    public static function resolveExpiry(string $plan, ?string $token): ?\Illuminate\Support\Carbon
    {
        $planMax = (int) config("plans.$plan.expiry_days", 7);
        $map     = ['24h' => 1, '1d' => 1, '3d' => 3, '7d' => 7, '30d' => 30, '60d' => 60, '1y' => 365, 'forever' => null];
        $token   = $token ?: '7d';
        $days    = array_key_exists($token, $map) ? $map[$token] : 7;
        if ($days === null) {
            return $planMax >= 3650 ? null : now()->addDays($planMax);   // true "forever" only for top tier
        }
        return now()->addDays(min($days, $planMax));
    }
}
