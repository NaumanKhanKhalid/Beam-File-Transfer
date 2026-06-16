<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;

/**
 * Thin Safepay client (Pakistan PSP — cards + JazzCash + Easypaisa).
 *
 * Flow used here (Safepay hosted checkout):
 *   1. init($amount)  → ask Safepay for a payment "tracker" token
 *   2. checkoutUrl()  → build the hosted-checkout URL the user is redirected to
 *   3. user pays on Safepay, Safepay redirects back to our callback
 *   4. verify(tracker) → confirm the payment really succeeded before activating
 *
 * Endpoints/field names follow Safepay's documented API; if your dashboard uses
 * a different version, adjust here only. All network calls are best-effort and
 * return null on failure so the caller can surface a clean error.
 */
class Safepay
{
    public static function enabled(): bool
    {
        return (bool) config('safepay.enabled');
    }

    private static function base(): string
    {
        $env = config('safepay.env', 'sandbox');
        return rtrim(config("safepay.base.$env"), '/');
    }

    /**
     * Create a payment session (tracker) via Safepay's v3 payments API.
     * Returns the tracker token or null.
     */
    public static function init(int $amountMinor, string $currency, string $orderId, ?string $passport = null): ?string
    {
        try {
            $res = Http::withHeaders(['X-SFPY-MERCHANT-SECRET' => config('safepay.secret')])
                ->acceptJson()
                ->post(self::base() . '/order/payments/v3/', [
                    'merchant_api_key' => config('safepay.api_key'),
                    'intent'           => 'CYBERSOURCE',
                    'mode'             => 'payment',
                    'entry_mode'       => 'flex',
                    'currency'         => $currency,
                    'amount'           => $amountMinor,
                ]);
            return $res->successful() ? data_get($res->json(), 'data.tracker.token') : null;
        } catch (\Throwable $e) {
            report($e);
            return null;
        }
    }

    /**
     * Time-based client auth token ("passport"/tbt) the embedded checkout needs
     * alongside the tracker — without it the hosted page shows “Session expired”.
     */
    public static function passport(): ?string
    {
        try {
            $res = Http::withHeaders(['X-SFPY-MERCHANT-SECRET' => config('safepay.secret')])
                ->acceptJson()
                ->post(self::base() . '/client/passport/v1/token', new \stdClass());   // empty JSON {}
            $json = $res->json();
            return is_string(data_get($json, 'data')) ? data_get($json, 'data') : data_get($json, 'data.token');
        } catch (\Throwable $e) {
            report($e);
            return null;
        }
    }

    /** Hosted-checkout URL the browser is redirected to. */
    public static function checkoutUrl(string $tracker, string $tbt, string $redirectUrl, string $cancelUrl): string
    {
        $env = config('safepay.env', 'sandbox');
        $q = http_build_query([
            'env'          => $env,
            'environment'  => $env,
            'beacon'       => $tracker,
            'tracker'      => $tracker,
            'tbt'          => $tbt,
            'source'       => 'custom',
            'redirect_url' => $redirectUrl,
            'cancel_url'   => $cancelUrl,
        ]);
        return rtrim(config("safepay.checkout.$env"), '/') . '/pay?' . $q;
    }

    /** Verify a tracker really reached a paid/complete state. */
    public static function verify(string $tracker): bool
    {
        try {
            $res = Http::withHeaders(['X-SFPY-MERCHANT-SECRET' => config('safepay.secret')])
                ->acceptJson()
                ->get(self::base() . "/order/v1/{$tracker}");
            $state = data_get($res->json(), 'data.state') ?? data_get($res->json(), 'data.payment.state');
            return in_array(strtoupper((string) $state), ['PAID', 'COMPLETED', 'TRACKER_ENDED', 'SUCCEEDED'], true);
        } catch (\Throwable $e) {
            report($e);
            return false;
        }
    }
}
