<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * One row per IP that has spent its free guest send. Presence = guest blocked.
 */
class GuestPass extends Model
{
    protected $fillable = ['ip', 'used_at'];

    protected function casts(): array
    {
        return ['used_at' => 'datetime'];
    }

    /** Has this IP already used its one-time guest send? */
    public static function spent(string $ip): bool
    {
        return static::where('ip', $ip)->exists();
    }

    /** Record that this IP has now used its guest send (idempotent). */
    public static function burn(string $ip): void
    {
        static::firstOrCreate(['ip' => $ip], ['used_at' => now()]);
    }
}
