<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transfer_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transfer_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('kind')->default('default');   // video|image|audio|pdf|doc|zip|default
            $table->unsignedBigInteger('size_bytes')->default(0);
            $table->string('storage_path');               // path on the configured disk
            $table->string('mime')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transfer_files');
    }
};
