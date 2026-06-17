<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CheckoutRequest;
use App\Http\Resources\SubscriptionResource;
use App\Http\Resources\UserResource;
use App\Models\Subscription;
use App\Support\PlanRepo;
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
     * POST /api/subscription/checkout — start (and activate) a subscription.
     * Demo checkout: no real payment gateway; the plan activates immediately.
     */
    public function checkout(CheckoutRequest $request): JsonResponse
    {
        $user  = $request->user();
        $plan  = $request->input('plan');
        $cycle = $request->input('billing_cycle');
        $price = (int) PlanRepo::get($plan, $cycle);

        $subscription = $this->activate($user, $plan, $cycle, $price);

        return response()->json([
            'subscription' => new SubscriptionResource($subscription),
            'user'         => new UserResource($user->fresh()),
        ], 201);
    }

    /** Create + activate a subscription in one step (demo mode). */
    private function activate($user, string $plan, string $cycle, int $price): Subscription
    {
        $subscription = Subscription::create([
            'user_id'            => $user->id,
            'plan'               => $plan,
            'billing_cycle'      => $cycle,
            'status'             => 'active',
            'amount'             => $price,
            'current_period_end' => now()->addMonths($cycle === 'yearly' ? 12 : 1),
        ]);
        $user->update(['plan' => $plan]);
        return $subscription;
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
