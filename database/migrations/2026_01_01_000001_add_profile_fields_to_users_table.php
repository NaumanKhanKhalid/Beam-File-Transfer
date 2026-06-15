<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extra profile / billing columns on the default users table.
 * Run AFTER the framework's create_users_table migration.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('plan')->default('free')->after('email');   // free | pro | business
            $table->boolean('is_admin')->default(false)->after('plan');

            // Branding (Pro feature)
            $table->boolean('brand_enabled')->default(false);
            $table->string('brand_name')->nullable();
            $table->string('brand_accent', 9)->default('#4B3AFF');
            $table->string('brand_logo_path')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'plan', 'is_admin',
                'brand_enabled', 'brand_name', 'brand_accent', 'brand_logo_path',
            ]);
        });
    }
};
