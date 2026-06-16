<?php

/**
 * Safepay (Pakistan) payment config. Fill these in your .env — see
 * backend/.env.safepay.example. Without keys the app falls back to the demo
 * checkout (instant activate) so it still works for local testing.
 *
 * Get sandbox keys free at https://safepay.pk → Dashboard → Developers.
 */
return [
    'enabled'   => (bool) env('SAFEPAY_API_KEY'),
    'env'       => env('SAFEPAY_ENV', 'sandbox'),            // sandbox | production
    'api_key'   => env('SAFEPAY_API_KEY'),
    'secret'    => env('SAFEPAY_SECRET'),                    // v3 shared secret (signature verify)
    'webhook_secret' => env('SAFEPAY_WEBHOOK_SECRET'),
    'currency'  => env('SAFEPAY_CURRENCY', 'PKR'),

    // Base URLs per environment (Safepay sandbox vs live).
    'base' => [
        'sandbox'    => 'https://sandbox.api.getsafepay.com',
        'production' => 'https://api.getsafepay.com',
    ],
    'checkout' => [
        'sandbox'    => 'https://sandbox.api.getsafepay.com/embedded',
        'production' => 'https://getsafepay.com/embedded',
    ],
];
