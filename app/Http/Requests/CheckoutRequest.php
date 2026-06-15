<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'plan'          => ['required', 'in:pro,business'],
            'billing_cycle' => ['required', 'in:monthly,yearly'],
            // In production the card is tokenised client-side by your PSP
            // (Razorpay/Stripe). Never accept raw PAN on your server.
            'payment_token' => ['required', 'string'],
        ];
    }
}
