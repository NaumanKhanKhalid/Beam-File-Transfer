<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /** POST /api/register — create the account and start a session (cookie auth). */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create($request->validated() + ['plan' => 'free']);

        // Fire a verification email (non-blocking).
        \App\Http\Controllers\Api\EmailVerificationController::send($user);

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(['user' => new UserResource($user)], 201);
    }

    /** POST /api/login — verify credentials and start a session (cookie auth). */
    public function login(LoginRequest $request): JsonResponse
    {
        if (! Auth::attempt($request->only('email', 'password'), true)) {
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        $request->session()->regenerate();

        return response()->json(['user' => new UserResource(Auth::user())]);
    }

    /** GET /api/me  (auth:sanctum — session for the SPA) */
    public function me(Request $request): UserResource
    {
        return new UserResource($request->user()->load('subscription'));
    }

    /** POST /api/logout — end the session and clear the cookie. */
    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out.']);
    }
}
