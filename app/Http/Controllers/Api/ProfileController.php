<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    /** PATCH /api/profile — update name / email. */
    public function update(Request $request): UserResource
    {
        $data = $request->validate([
            'name'  => ['sometimes', 'string', 'max:120'],
            'email' => ['sometimes', 'email', Rule::unique('users')->ignore($request->user()->id)],
        ]);

        $request->user()->update($data);

        return new UserResource($request->user()->fresh());
    }

    /** PUT /api/profile/branding — Pro-only brand settings + logo upload. */
    public function branding(Request $request): UserResource
    {
        $user = $request->user();
        abort_unless($user->isPro(), 403, 'Branding is a Pro feature.');

        $data = $request->validate([
            'enabled' => ['boolean'],
            'name'    => ['nullable', 'string', 'max:60'],
            'accent'  => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'logo'    => ['nullable', 'image', 'max:2048'],
        ]);

        if ($request->hasFile('logo')) {
            if ($user->brand_logo_path) {
                Storage::disk('public')->delete($user->brand_logo_path);
            }
            $data['brand_logo_path'] = $request->file('logo')->store('brand-logos', 'public');
        }

        $user->update([
            'brand_enabled' => $data['enabled'] ?? $user->brand_enabled,
            'brand_name'    => $data['name']    ?? $user->brand_name,
            'brand_accent'  => $data['accent']  ?? $user->brand_accent,
            'brand_logo_path' => $data['brand_logo_path'] ?? $user->brand_logo_path,
        ]);

        return new UserResource($user->fresh());
    }

    /** POST /api/profile/avatar — upload (or remove) the profile photo. Any
     *  signed-in account can set one; guests have no account, so they can't. */
    public function avatar(Request $request): UserResource
    {
        $user = $request->user();

        // remove=1 clears the photo (falls back to initials).
        if ($request->boolean('remove')) {
            if ($user->avatar_url && ! str_starts_with($user->avatar_url, 'http')) {
                Storage::disk('public')->delete($user->avatar_url);
            }
            $user->update(['avatar_url' => null]);
            return new UserResource($user->fresh());
        }

        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
        ]);

        // Drop a previous local upload (don't try to delete a Google URL).
        if ($user->avatar_url && ! str_starts_with($user->avatar_url, 'http')) {
            Storage::disk('public')->delete($user->avatar_url);
        }
        $path = $request->file('avatar')->store('avatars', 'public');
        $user->update(['avatar_url' => $path]);

        return new UserResource($user->fresh());
    }

    /** PUT /api/profile/password — change password after confirming the current one. */
    public function password(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password'         => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = $request->user();
        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['That’s not your current password.'],
            ]);
        }

        $user->update(['password' => Hash::make($data['password'])]);

        // Invalidate other sessions/tokens, keep the current one alive.
        $current = $user->currentAccessToken();
        $user->tokens()->where('id', '!=', $current?->id)->delete();

        return response()->json(['message' => 'Password updated.']);
    }

    /** DELETE /api/account — permanently delete the account after password confirm. */
    public function destroy(Request $request): JsonResponse
    {
        $request->validate(['password' => ['required', 'string']]);
        $user = $request->user();

        if (! Hash::check($request->input('password'), $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['Password is incorrect.'],
            ]);
        }

        // Remove stored files for every transfer this user owns, then the rows.
        // (transfers.user_id is nullOnDelete, so without this they'd survive as
        // orphaned guest transfers — delete them; transfer_files cascade in DB.)
        foreach ($user->transfers()->pluck('id') as $id) {
            Storage::deleteDirectory("transfers/{$id}");
        }
        $user->transfers()->delete();
        if ($user->brand_logo_path) {
            Storage::disk('public')->delete($user->brand_logo_path);
        }
        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Account deleted.']);
    }
}
