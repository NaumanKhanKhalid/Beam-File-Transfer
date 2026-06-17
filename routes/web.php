<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\GoogleAuthController;

/*
|--------------------------------------------------------------------------
| Beam web routes (Blade front-end)
|--------------------------------------------------------------------------
| The UI is server-rendered with Blade for layout/chrome and hydrates
| dynamic data through the JSON API (routes/api.php) via beam-api.js —
| the same client the React front-end will use later.
|
| NOTE: pages are token-auth (Sanctum) on the client side, so these routes
| just render views; auth-dependent regions are hydrated by JS.
*/

// ---- Sender app -----------------------------------------------------------
Route::view('/', 'pages.send', ['active' => 'send', 'view' => 'sender'])->name('send');

Route::view('/transfers', 'pages.transfers', [
    'active' => 'transfers', 'view' => 'sender', 'title' => 'Transfers',
])->name('transfers');

Route::view('/settings', 'pages.settings', [
    'active' => 'settings', 'view' => 'sender', 'title' => 'Settings',
])->name('settings');

Route::view('/upgrade', 'pages.upgrade', [
    'active' => 'upgrade', 'view' => 'sender', 'title' => 'Upgrade',
])->name('upgrade');

// ---- Admin ----------------------------------------------------------------
Route::view('/admin', 'pages.admin')->name('admin')->middleware(['auth', 'admin']);
Route::view('/admin/plans', 'pages.admin-plans')->name('admin.plans')->middleware(['auth', 'admin']);

// ---- Auth (guest layout) --------------------------------------------------
Route::view('/login', 'pages.auth')->name('login');
Route::view('/reset-password', 'pages.reset-password')->name('password.reset');

// ---- Google OAuth ("Continue with Google") --------------------------------
Route::get('/auth/google/redirect', [GoogleAuthController::class, 'redirect'])->name('auth.google.redirect');
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback'])->name('auth.google.callback');

// ---- Recipient (public, guest layout) -------------------------------------
Route::view('/recipient', 'pages.recipient')->name('recipient.demo');
Route::get('/r/{slug}', fn (string $slug) => view('pages.recipient', ['slug' => $slug]))->name('recipient.show');
