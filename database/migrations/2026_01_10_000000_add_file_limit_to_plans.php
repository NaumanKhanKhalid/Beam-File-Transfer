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
            // Max number of files allowed in a single transfer (null = unlimited).
            $table->unsignedInteger('file_limit')->nullable()->after('download_limit');
        });

        foreach (config('plans', []) as $key => $vals) {
            if (! array_key_exists('file_limit', $vals)) continue;
            DB::table('plans')->where('key', $key)->update(['file_limit' => $vals['file_limit']]);
        }
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn('file_limit');
        });
    }
};
