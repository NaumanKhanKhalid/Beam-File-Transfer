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
        'total_bytes', 'download_count', 'download_limit', 'expires_at', 'burned_at', 'brand',
    ];

    protected $hidden = ['password_hash', 'sender_ip'];

    protected function casts(): array
    {
        return [
            'recipients'          => 'array',
            'brand'               => 'array',
            'burn_after_download' => 'boolean',
            'notify_on_download'  => 'boolean',
            'download_limit'      => 'integer',
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
        $planMaxMin = \App\Support\PlanRepo::get($plan, 'expiry_minutes', 7 * 1440);   // null = unlimited
        $map = [
            '10m' => 10, '30m' => 30, '1h' => 60, '6h' => 360, '12h' => 720,
            '24h' => 1440, '1d' => 1440, '3d' => 4320, '7d' => 10080,
            '30d' => 43200, '60d' => 86400, '1y' => 525600, 'forever' => null,
        ];
        $token  = $token ?: '7d';
        $reqMin = array_key_exists($token, $map) ? $map[$token] : 10080;
        if ($planMaxMin === null) {
            return $reqMin === null ? null : now()->addMinutes($reqMin);   // unlimited plan honours the request
        }
        $eff = $reqMin === null ? $planMaxMin : min($reqMin, $planMaxMin);
        return now()->addMinutes($eff);
    }
}
