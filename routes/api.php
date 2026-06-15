<?php

use App\Http\Controllers\Api\Admin\PlanController;
use App\Http\Controllers\Api\Admin\SubscriberController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChunkUploadController;
use App\Http\Controllers\Api\EmailVerificationController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\SubscriptionController;
use App\Http\Controllers\Api\TransferController;
use App\Http\Controllers\Api\UsageController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Beam API routes  (prefixed with /api by the framework)
|--------------------------------------------------------------------------
| Auth: Laravel Sanctum personal-access tokens.
| Send the token as:  Authorization: Bearer <token>
*/

// ---- Public ---------------------------------------------------------------
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login',    [AuthController::class, 'login']);

// Password reset (token via email) + email verification landing.
Route::post('/password/forgot', [PasswordResetController::class, 'forgot']);
Route::post('/password/reset',  [PasswordResetController::class, 'reset']);
Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
    ->middleware('signed')->name('verification.verify');

Route::get('/plans',     [SubscriptionController::class, 'plans']);

// Storage usage / quota for the current sender (guest by IP, or signed-in user).
Route::get('/usage',     [UsageController::class, 'show']);

// Guests can create transfers and recipients can open them without an account.
Route::post('/transfers',          [TransferController::class, 'store']);
Route::get('/t/{slug}',            [TransferController::class, 'show']);
Route::post('/t/{slug}/unlock',    [TransferController::class, 'unlock']);
Route::get('/t/{slug}/zip',        [TransferController::class, 'zip']);
Route::get('/t/{slug}/files/{file}', [TransferController::class, 'download']);

// Sender's own transfers + dashboard stats (signed-in by account, guest by IP).
Route::get('/transfers',         [TransferController::class, 'index']);
Route::get('/transfers/stats',   [TransferController::class, 'stats']);

// Resumable chunked upload + finalize (public; quota enforced on commit).
Route::get('/uploads/status',    [ChunkUploadController::class, 'status']);
Route::post('/uploads/chunk',    [ChunkUploadController::class, 'chunk']);
Route::post('/transfers/commit', [TransferController::class, 'commit']);
Route::delete('/transfers/{transfer}', [TransferController::class, 'destroy']);

// ---- Authenticated --------------------------------------------------------
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me',      [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/email/resend', [EmailVerificationController::class, 'resend']);

    Route::patch('/profile',          [ProfileController::class, 'update']);
    Route::put('/profile/password',   [ProfileController::class, 'password']);
    Route::put('/profile/branding',   [ProfileController::class, 'branding']);
    Route::delete('/account',         [ProfileController::class, 'destroy']);

    Route::get('/subscription',           [SubscriptionController::class, 'current']);
    Route::post('/subscription/checkout', [SubscriptionController::class, 'checkout']);
    Route::delete('/subscription',        [SubscriptionController::class, 'cancel']);

    // ---- Admin only -------------------------------------------------------
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/subscribers',            [SubscriberController::class, 'index']);
        Route::post('/subscribers',           [SubscriberController::class, 'store']);
        Route::patch('/subscribers/{user}',   [SubscriberController::class, 'update']);
        Route::delete('/subscribers/{user}',  [SubscriberController::class, 'destroy']);

        Route::get('/plans',          [PlanController::class, 'index']);
        Route::post('/plans',         [PlanController::class, 'store']);
        Route::put('/plans/{key}',    [PlanController::class, 'update']);
        Route::delete('/plans/{key}', [PlanController::class, 'destroy']);
    });
});
