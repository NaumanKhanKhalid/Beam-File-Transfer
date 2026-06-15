<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /** POST /api/register */
    public function register(RegisterRequest $request): JsonResponse
    {
        $user = User::create($request->validated() + ['plan' => 'free']);

        // Fire a verification email (non-blocking — the user still gets a token).
        \App\Http\Controllers\Api\EmailVerificationController::send($user);

        return $this->withToken($user, 201);
    }

    /** POST /api/login */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        return $this->withToken($user);
    }

    /** GET /api/me  (auth:sanctum) */
    public function me(Request $request): UserResource
    {
        return new UserResource($request->user()->load('subscription'));
    }

    /** POST /api/logout  (auth:sanctum) */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    private function withToken(User $user, int $status = 200): JsonResponse
    {
        $token = $user->createToken('beam-spa')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => new UserResource($user),
        ], $status);
    }
}
