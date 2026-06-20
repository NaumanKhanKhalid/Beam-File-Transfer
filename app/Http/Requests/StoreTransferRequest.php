<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTransferRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // guests may send too
    }

    public function rules(): array
    {
        return [
            'files'        => ['required', 'array', 'min:1'],
            'files.*'      => ['file', 'max:204800'],          // 200 MB/file demo cap — tune per disk
            'paths'        => ['nullable', 'array'],            // folder-relative names (optional, aligned with files)
            'paths.*'      => ['string', 'max:1024'],
            'title'        => ['nullable', 'string', 'max:120'],
            'sender_name'  => ['nullable', 'string', 'max:80'],   // guest's name (signed-in users use their account name)
            'message'      => ['nullable', 'string', 'max:1000'],
            'recipients'   => ['nullable', 'array'],
            'recipients.*' => ['email'],
            'expiry'       => ['nullable', 'string', 'max:16', 'regex:/^(m:\d{1,8}|1h|24h|1d|3d|7d|30d|60d|1y|forever)$/'],
            'password'     => ['nullable', 'string', 'min:4', 'max:64'],
            'burn'         => ['boolean'],
            'notify'       => ['boolean'],
            'branded'      => ['boolean'],
        ];
    }
}
