<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            // Safepay tracker token — links a pending subscription to its payment
            // so the callback/webhook can find and activate the right row.
            $table->string('provider_ref')->nullable()->after('status')->index();
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn('provider_ref');
        });
    }
};
