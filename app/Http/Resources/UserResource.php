<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'       => $this->id,
            'name'     => $this->name,
            'email'    => $this->email,
            'plan'     => $this->plan,
            'is_admin' => $this->is_admin,
            'verified' => (bool) $this->email_verified_at,
            'avatar'   => $this->avatarUrl(),
            'initials' => collect(explode(' ', trim($this->name)))
                ->take(2)->map(fn ($w) => mb_substr($w, 0, 1))->join(''),
            'brand'    => [
                'enabled' => $this->brand_enabled,
                'name'    => $this->brand_name,
                'accent'  => $this->brand_accent,
                'logo'    => $this->brand_logo_path
                    ? asset('storage/' . $this->brand_logo_path)
                    : null,
            ],
        ];
    }
}
