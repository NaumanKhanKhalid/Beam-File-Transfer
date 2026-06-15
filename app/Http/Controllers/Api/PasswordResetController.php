<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Forgot / reset password — token-based, no Laravel UI scaffolding.
 *  POST /api/password/forgot  { email }                       → emails a reset link
 *  POST /api/password/reset   { token, email, password, ... } → sets the new password
 *
 * Tokens are stored hashed in the `password_reset_tokens` table (Laravel default)
 * and expire after 60 minutes.
 */
class PasswordResetController extends Controller
{
    private const TTL_MINUTES = 60;

    /** Always returns 200 — never reveals whether an email is registered. */
    public function forgot(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);
        $email = $request->input('email');
        $user  = User::where('email', $email)->first();

        if ($user) {
            $token = Str::random(64);
            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $email],
                ['token' => Hash::make($token), 'created_at' => now()]
            );
            $link = rtrim(config('app.url'), '/') . '/reset-password?token=' . $token . '&email=' . urlencode($email);
            try {
                Mail::to($email)->send(new PasswordResetMail($user, $link));
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return response()->json(['message' => 'If that email is registered, a reset link is on its way.']);
    }

    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token'    => ['required', 'string'],
            'email'    => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $row = DB::table('password_reset_tokens')->where('email', $data['email'])->first();
        if (! $row || ! Hash::check($data['token'], $row->token)) {
            throw ValidationException::withMessages(['token' => ['This reset link is invalid.']]);
        }
        if (Carbon::parse($row->created_at)->addMinutes(self::TTL_MINUTES)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $data['email'])->delete();
            throw ValidationException::withMessages(['token' => ['This reset link has expired. Request a new one.']]);
        }

        $user = User::where('email', $data['email'])->firstOrFail();
        $user->update(['password' => Hash::make($data['password'])]);
        $user->tokens()->delete();                                        // sign out everywhere
        DB::table('password_reset_tokens')->where('email', $data['email'])->delete();

        return response()->json(['message' => 'Password reset. You can sign in now.']);
    }
}
