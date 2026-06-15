<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CheckoutRequest;
use App\Http\Resources\SubscriptionResource;
use App\Http\Resources\UserResource;
use App\Models\Subscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    /** GET /api/plans — public plan catalogue (config + admin overrides). */
    public function plans(): JsonResponse
    {
        return response()->json(['plans' => \App\Support\PlanRepo::all()]);
    }

    /** GET /api/subscription — current user's subscription. */
    public function current(Request $request)
    {
        $sub = $request->user()->subscription;

        return $sub ? new SubscriptionResource($sub) : response()->json(['data' => null]);
    }

    /**
     * POST /api/subscription/checkout — activate a paid plan.
     * In production: verify `payment_token` with your PSP BEFORE creating the row.
     */
    public function checkout(CheckoutRequest $request): JsonResponse
    {
        $user  = $request->user();
        $plan  = $request->input('plan');
        $cycle = $request->input('billing_cycle');
        $price = \App\Support\PlanRepo::get($plan, $cycle);

        // TODO: $this->psp->capture($request->payment_token, $price);

        $subscription = Subscription::create([
            'user_id'            => $user->id,
            'plan'               => $plan,
            'billing_cycle'      => $cycle,
            'status'             => 'active',
            'amount'             => $price,
            'current_period_end' => now()->addYear($cycle === 'yearly' ? 1 : 0)
                                         ->addMonth($cycle === 'monthly' ? 1 : 0),
        ]);

        $user->update(['plan' => $plan]);

        return response()->json([
            'subscription' => new SubscriptionResource($subscription),
            'user'         => new UserResource($user->fresh()),
        ], 201);
    }

    /** DELETE /api/subscription — cancel (downgrade to Free at period end). */
    public function cancel(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->subscription?->update(['status' => 'canceled', 'canceled_at' => now()]);
        $user->update(['plan' => 'free']);

        return response()->json(['message' => 'Subscription canceled.']);
    }
}
