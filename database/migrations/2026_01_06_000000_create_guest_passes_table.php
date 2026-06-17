<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One-time guest pass: records every IP that has used the free guest send.
        // Once an IP is here, further guest sends are blocked — they must create an
        // account. Persisted (not a transfer row) so it survives expiry/deletion of
        // the transfer itself.
        Schema::create('guest_passes', function (Blueprint $table) {
            $table->id();
            $table->string('ip', 45)->unique();
            $table->timestamp('used_at')->useCurrent();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guest_passes');
    }
};
