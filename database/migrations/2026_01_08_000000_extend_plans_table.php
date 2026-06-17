<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            // Marketing copy + a "Most popular" flag, so the upgrade page is fully
            // admin-driven (no hard-coded plan cards).
            $table->string('tagline')->nullable()->after('name');
            $table->boolean('popular')->default(false)->after('branding');

            // Link expiry stored in MINUTES (null = unlimited). Replaces expiry_days
            // as the source of truth so admins can set short, minute-level expiries.
            $table->unsignedBigInteger('expiry_minutes')->nullable()->after('max_bytes');

            // Max downloads allowed per transfer (null = unlimited).
            $table->unsignedInteger('download_limit')->nullable()->after('expiry_minutes');

            // Editable marketing bullet list shown on the upgrade page.
            $table->json('features')->nullable()->after('download_limit');
        });

        // Backfill minutes from the legacy day value for existing rows.
        DB::table('plans')->whereNull('expiry_minutes')->update([
            'expiry_minutes' => DB::raw('expiry_days * 1440'),
        ]);

        // Backfill the new copy fields for already-seeded plans (fresh installs get
        // these from config via PlanRepo::seedIfEmpty instead).
        foreach (config('plans', []) as $key => $vals) {
            $row = DB::table('plans')->where('key', $key)->first();
            if (! $row) continue;
            $update = ['popular' => $vals['popular'] ?? false];
            if (empty($row->features))  $update['features']  = json_encode($vals['features'] ?? []);
            if (empty($row->tagline))   $update['tagline']   = $vals['tagline'] ?? null;
            if ($row->download_limit === null && array_key_exists('download_limit', $vals)) {
                $update['download_limit'] = $vals['download_limit'];
            }
            DB::table('plans')->where('key', $key)->update($update);
        }
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['tagline', 'popular', 'expiry_minutes', 'download_limit', 'features']);
        });
    }
};
