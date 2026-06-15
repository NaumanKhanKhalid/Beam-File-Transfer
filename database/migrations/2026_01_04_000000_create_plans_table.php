<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();              // stable identifier (free, pro, custom-…)
            $table->string('name');
            $table->unsignedBigInteger('monthly')->default(0);
            $table->unsignedBigInteger('yearly')->default(0);
            $table->unsignedBigInteger('max_bytes')->default(2 * 1024 * 1024 * 1024);
            $table->unsignedInteger('expiry_days')->default(7);
            $table->boolean('branding')->default(false);
            $table->unsignedInteger('sort')->default(0);  // display order
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
