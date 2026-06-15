<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transfers', function (Blueprint $table) {
            // Sender IP — lets us meter GUEST usage per device/network so the free
            // quota can't be reset by clearing cookies or using incognito.
            $table->string('sender_ip', 45)->nullable()->after('sender_name');
            $table->index(['sender_ip', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('transfers', function (Blueprint $table) {
            $table->dropIndex(['sender_ip', 'created_at']);
            $table->dropColumn('sender_ip');
        });
    }
};
