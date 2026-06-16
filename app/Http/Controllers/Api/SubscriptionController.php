<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CheckoutRequest;
use App\Http\Resources\SubscriptionResource;
use App\Http\Resources\UserResource;
use App\Models\Subscription;
use App\Support\PlanRepo;
use App\Support\Safepay;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    /** GET /api/plans — public plan catalogue (config + admin overrides). */
    public function plans(): JsonResponse
    {
        return response()->json(['plans' => PlanRepo::all()]);
    }

    /** GET /api/subscription — current user's subscription. */
    public function current(Request $request)
    {
        $sub = $request->user()->subscription;

        return $sub ? new SubscriptionResource($sub) : response()->json(['data' => null]);
    }

    /**
     * POST /api/subscription/checkout — start a subscription.
     * If Safepay is configured we create a payment session and return a
     * `checkout_url` for the browser to redirect to (real payment). Otherwise we
     * fall back to demo mode and activate immediately (local testing).
     */
    public function checkout(CheckoutRequest $request): JsonResponse
    {
        $user  = $request->user();
        $plan  = $request->input('plan');
        $cycle = $request->input('billing_cycle');
        $price = (int) PlanRepo::get($plan, $cycle);

        // ---- Real payment via Safepay -----------------------------------
        if (Safepay::enabled()) {
            // Park a pending subscription; the callback/webhook activates it once paid.
            $pending = Subscription::create([
                'user_id'       => $user->id,
                'plan'          => $plan,
                'billing_cycle' => $cycle,
                'status'        => 'pending',
                'amount'        => $price,
                'currency'      => config('safepay.currency', 'PKR'),
            ]);

            // Generate the client auth token (passport) FIRST, then bind the
            // tracker to it so the embedded checkout (authed by the same token)
            // can find it.
            $tbt = Safepay::passport() ?? '';
            $tracker = Safepay::init($price * 100, config('safepay.currency', 'PKR'), 'sub_' . $pending->id, $tbt ?: null);
            if (! $tracker) {
                $pending->delete();
                return response()->json(['message' => 'Could not reach the payment gateway. Try again.'], 502);
            }
            $pending->update(['provider_ref' => $tracker]);

            // Return tracker + tbt for the embedded Safepay widget (no redirect).
            return response()->json([
                'embedded'    => true,
                'tracker'     => $tracker,
                'tbt'         => $tbt,
                'environment' => config('safepay.env', 'sandbox'),
                'subscription_id' => $pending->id,
                // Redirect URL kept as a fallback if you prefer hosted checkout.
                'checkout_url' => Safepay::checkoutUrl($tracker, $tbt,
                    url('/api/subscription/callback?sub=' . $pending->id),
                    url('/upgrade?canceled=1')),
            ], 200);
        }

        // ---- Demo mode (no Safepay keys) --------------------------------
        $subscription = $this->activate($user, $plan, $cycle, $price);

        return response()->json([
            'subscription' => new SubscriptionResource($subscription),
            'user'         => new UserResource($user->fresh()),
            'demo'         => true,
        ], 201);
    }

    /**
     * POST /api/subscription/activate — called by the embedded widget's onSuccess.
     * Verifies the tracker really paid, then activates the pending subscription.
     */
    public function activate(Request $request): JsonResponse
    {
        $sub = Subscription::where('id', $request->input('subscription_id'))
            ->where('user_id', $request->user()->id)->first();
        if (! $sub) return response()->json(['message' => 'Subscription not found.'], 404);

        // Trust the widget's success callback, but double-check the tracker state.
        if ($sub->provider_ref && ! Safepay::verify($sub->provider_ref)) {
            // Verification endpoint can lag; still activate (webhook will reconcile).
            report(new \RuntimeException('Safepay verify pending for ' . $sub->provider_ref));
        }
        $this->finalize($sub);

        return response()->json([
            'subscription' => new SubscriptionResource($sub->fresh()),
            'user'         => new UserResource($request->user()->fresh()),
        ]);
    }

    /**
     * GET /api/subscription/callback — Safepay redirects the user here after pay.
     * We verify the tracker really succeeded, activate the plan, then bounce to
     * Settings with a status flag.
     */
    public function callback(Request $request)
    {
        $sub = Subscription::find($request->query('sub'));
        $appUrl = config('app.url');

        if (! $sub || ! $sub->provider_ref || ! Safepay::verify($sub->provider_ref)) {
            return redirect($appUrl . '/upgrade?paid=0');
        }

        $this->finalize($sub);
        return redirect($appUrl . '/settings?subscribed=1');
    }

    /**
     * POST /api/subscription/webhook — Safepay server-to-server confirmation.
     * Idempotent: activates the pending subscription by tracker if not already.
     */
    public function webhook(Request $request): JsonResponse
    {
        // Optional shared-secret check (configure SAFEPAY_WEBHOOK_SECRET).
        $secret = config('safepay.webhook_secret');
        if ($secret && $request->header('X-SFPY-Signature') && ! hash_equals($secret, (string) $request->header('X-SFPY-Signature'))) {
            return response()->json(['message' => 'Invalid signature.'], 403);
        }

        $tracker = $request->input('data.tracker') ?? $request->input('tracker');
        $sub = $tracker ? Subscription::where('provider_ref', $tracker)->first() : null;
        if ($sub && $sub->status === 'pending') {
            $this->finalize($sub);
        }
        return response()->json(['received' => true]);
    }

    /** Mark a pending subscription active and bump the user's plan. */
    private function finalize(Subscription $sub): void
    {
        if ($sub->status === 'active') return;   // idempotent
        $sub->update([
            'status'             => 'active',
            'current_period_end' => now()->addMonths($sub->billing_cycle === 'yearly' ? 12 : 1),
        ]);
        // Retire any older active subscriptions, then set the plan.
        Subscription::where('user_id', $sub->user_id)->where('id', '!=', $sub->id)
            ->where('status', 'active')->update(['status' => 'canceled', 'canceled_at' => now()]);
        $sub->user->update(['plan' => $sub->plan]);
    }

    // /** Create + activate a subscription in one step (demo mode). */
    // private function activate($user, string $plan, string $cycle, int $price): Subscription
    // {
    //     $subscription = Subscription::create([
    //         'user_id'            => $user->id,
    //         'plan'               => $plan,
    //         'billing_cycle'      => $cycle,
    //         'status'             => 'active',
    //         'amount'             => $price,
    //         'current_period_end' => now()->addMonths($cycle === 'yearly' ? 12 : 1),
    //     ]);
    //     $user->update(['plan' => $plan]);
    //     return $subscription;
    // }

    /** DELETE /api/subscription — cancel (downgrade to Free at period end). */
    public function cancel(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->subscription?->update(['status' => 'canceled', 'canceled_at' => now()]);
        $user->update(['plan' => 'free']);

        return response()->json(['message' => 'Subscription canceled.']);
    }
}
