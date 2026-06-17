<?php

namespace App\Support;

use App\Models\Plan;
use Illuminate\Support\Str;

/**
 * Plan catalogue — DB-backed, editable by admins.
 *
 * Plans live in the `plans` table. On first access (empty table) we seed it
 * from config/plans.php so a fresh install has Free/Pro/Business. Admins can
 * then edit, add, or remove plans. Quota, expiry clamping, checkout pricing and
 * the public /plans endpoint all read through here — one source of truth.
 */
class PlanRepo
{
    /** Full catalogue as an assoc array keyed by plan key (ordered by `sort`). */
    public static function all(): array
    {
        self::seedIfEmpty();
        $out = [];
        foreach (Plan::orderBy('sort')->orderBy('id')->get() as $p) {
            $out[$p->key] = [
                'name'           => $p->name,
                'tagline'        => $p->tagline,
                'monthly'        => $p->monthly,
                'yearly'         => $p->yearly,
                'max_bytes'      => $p->max_bytes,
                'expiry_minutes' => $p->expiry_minutes,
                'download_limit' => $p->download_limit,
                'branding'       => $p->branding,
                'popular'        => $p->popular,
                'features'       => $p->features ?? [],
            ];
        }
        return $out;
    }

    /** One plan's value, e.g. get('pro', 'max_bytes'). */
    public static function get(string $plan, string $key, $default = null)
    {
        return self::all()[$plan][$key] ?? $default;
    }

    /** Create a new plan (auto-keyed from the name if no key given). */
    public static function create(array $data): Plan
    {
        self::seedIfEmpty();
        $key = $data['key'] ?? Str::slug($data['name'] ?? 'plan') ?: 'plan';
        // Ensure uniqueness.
        $base = $key; $n = 2;
        while (Plan::where('key', $key)->exists()) { $key = $base . '-' . $n++; }
        return Plan::create(array_merge(self::clean($data), [
            'key'  => $key,
            'sort' => (int) (Plan::max('sort') ?? 0) + 1,
        ]));
    }

    /** Update an existing plan by key. */
    public static function update(string $key, array $data): ?Plan
    {
        $plan = Plan::where('key', $key)->first();
        if (! $plan) return null;
        $plan->update(self::clean($data));
        return $plan;
    }

    public static function delete(string $key): bool
    {
        return (bool) Plan::where('key', $key)->delete();
    }

    /** Keep only known, sanitized fields. */
    private static function clean(array $data): array
    {
        $out = [];
        foreach (['name', 'tagline', 'monthly', 'yearly', 'max_bytes', 'expiry_minutes', 'download_limit', 'branding', 'popular', 'features'] as $f) {
            if (array_key_exists($f, $data)) $out[$f] = $data[$f];
        }
        return $out;
    }

    /** Seed the table from config/plans.php the first time it's used. */
    private static function seedIfEmpty(): void
    {
        if (Plan::count() > 0) return;
        $i = 0;
        foreach (config('plans', []) as $key => $vals) {
            Plan::create([
                'key'            => $key,
                'name'           => $vals['name'] ?? ucfirst($key),
                'tagline'        => $vals['tagline'] ?? null,
                'monthly'        => $vals['monthly'] ?? 0,
                'yearly'         => $vals['yearly'] ?? 0,
                'max_bytes'      => $vals['max_bytes'] ?? 0,
                'expiry_minutes' => $vals['expiry_minutes'] ?? (($vals['expiry_days'] ?? 7) * 1440),
                'download_limit' => $vals['download_limit'] ?? null,
                'branding'       => $vals['branding'] ?? false,
                'popular'        => $vals['popular'] ?? false,
                'features'       => $vals['features'] ?? [],
                'sort'           => $i++,
            ]);
        }
    }
}
