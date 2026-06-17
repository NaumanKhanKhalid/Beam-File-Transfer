<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transfers', function (Blueprint $table) {
            // Max downloads allowed for this transfer (snapshot of the sender's plan
            // at creation time). null = unlimited. Enforced in the download routes.
            $table->unsignedInteger('download_limit')->nullable()->after('download_count');
        });
    }

    public function down(): void
    {
        Schema::table('transfers', function (Blueprint $table) {
            $table->dropColumn('download_limit');
        });
    }
};
