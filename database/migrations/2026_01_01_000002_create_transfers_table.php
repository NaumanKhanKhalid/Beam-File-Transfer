<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete(); // null = guest send
            $table->string('slug')->unique();                 // public link id, e.g. "4k2-9zq-mara"
            $table->string('title');
            $table->text('message')->nullable();
            $table->string('sender_name');
            $table->json('recipients')->nullable();            // array of emails

            // Options
            $table->string('password_hash')->nullable();       // null = not protected
            $table->boolean('burn_after_download')->default(false);
            $table->boolean('notify_on_download')->default(true);

            // Lifecycle
            $table->unsignedBigInteger('total_bytes')->default(0);
            $table->unsignedInteger('download_count')->default(0);
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('burned_at')->nullable();        // set when burned

            // Branding snapshot (so the page looks right even if the sender later changes brand)
            $table->json('brand')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transfers');
    }
};
