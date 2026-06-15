<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\VerifyEmailMail;
use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

/**
 * Email verification (token API friendly).
 *  - register() fires VerifyEmailMail with a signed link (non-blocking: the user
 *    still gets an auth token, but the app can nudge them to verify).
 *  - GET  /api/email/verify/{id}/{hash}  (signed)  → marks verified, redirects to app
 *  - POST /api/email/resend  (auth)                → re-sends the link
 */
class EmailVerificationController extends Controller
{
    /** Build the signed verification URL for a user (1-hour expiry). */
    public static function linkFor(User $user): string
    {
        return URL::temporarySignedRoute(
            'verification.verify',
            now()->addHours(24),
            ['id' => $user->id, 'hash' => sha1($user->email)]
        );
    }

    public static function send(User $user): void
    {
        if ($user->email_verified_at) return;
        try {
            Mail::to($user->email)->send(new VerifyEmailMail($user, self::linkFor($user)));
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /** Signed link landing — verifies, then bounces to the app with a flag. */
    public function verify(Request $request, int $id, string $hash)
    {
        $user = User::findOrFail($id);
        $appUrl = rtrim(config('app.url'), '/');

        if (! hash_equals($hash, sha1($user->email))) {
            return redirect($appUrl . '/login?verified=0');
        }
        if (! $user->email_verified_at) {
            $user->forceFill(['email_verified_at' => now()])->save();
            event(new Verified($user));
        }
        return redirect($appUrl . '/?verified=1');
    }

    /** Re-send the verification email to the signed-in user. */
    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user->email_verified_at) {
            return response()->json(['message' => 'Your email is already verified.']);
        }
        self::send($user);
        return response()->json(['message' => 'Verification email sent.']);
    }
}
