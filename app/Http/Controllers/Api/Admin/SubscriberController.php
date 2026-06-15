<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin subscription management. Every route is guarded by the
 * `admin` middleware (see routes/api.php), so only is_admin users reach here.
 */
class SubscriberController extends Controller
{
    /** GET /api/admin/subscribers — list with their latest subscription. */
    public function index(): JsonResponse
    {
        $users = User::with('subscription')->latest()->get();

        return response()->json([
            'stats'       => $this->stats(),
            'subscribers' => $users->map(fn (User $u) => $this->row($u))->values(),
        ]);
    }

    /** POST /api/admin/subscribers — create a user + assign a plan. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'   => ['required', 'string', 'max:120'],
            'email'  => ['required', 'email', 'unique:users,email'],
            'plan'   => ['required', 'in:free,pro,business'],
            'status' => ['required', 'in:active,past_due,canceled'],
        ]);

        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => str()->random(24),   // they reset via "forgot password"
            'plan'     => $data['plan'],
        ]);

        $this->syncSubscription($user, $data['plan'], $data['status']);

        return response()->json($this->row($user->fresh('subscription')), 201);
    }

    /** PATCH /api/admin/subscribers/{user} — change plan / status. */
    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'plan'   => ['sometimes', 'in:free,pro,business'],
            'status' => ['sometimes', 'in:active,past_due,canceled'],
        ]);

        $plan   = $data['plan']   ?? $user->plan;
        $status = $data['status'] ?? optional($user->subscription)->status ?? 'active';

        $user->update(['plan' => $plan]);
        $this->syncSubscription($user, $plan, $status);

        return response()->json($this->row($user->fresh('subscription')));
    }

    /** DELETE /api/admin/subscribers/{user} */
    public function destroy(User $user): JsonResponse
    {
        $user->delete();

        return response()->json(['message' => 'Subscriber removed.']);
    }

    // ---- helpers ----------------------------------------------------------

    private function syncSubscription(User $user, string $plan, string $status): void
    {
        if ($plan === 'free') {
            $user->subscription?->update(['status' => 'canceled', 'canceled_at' => now()]);
            return;
        }

        $amount = config("plans.$plan.yearly");
        Subscription::updateOrCreate(
            ['user_id' => $user->id],
            [
                'plan'        => $plan,
                'status'      => $status,
                'amount'      => $status === 'active' ? $amount : 0,
                'canceled_at' => $status === 'canceled' ? now() : null,
            ],
        );
    }

    private function row(User $u): array
    {
        $sub = $u->subscription;

        return [
            'id'     => $u->id,
            'name'   => $u->name,
            'email'  => $u->email,
            'plan'   => ucfirst($u->plan),
            'status' => $sub?->status ?? 'active',
            'mrr'    => $sub && $sub->status === 'active' ? $sub->amount : 0,
            'since'  => $u->created_at->format('M Y'),
            'initials' => collect(explode(' ', trim($u->name)))->take(2)
                ->map(fn ($w) => mb_substr($w, 0, 1))->join(''),
        ];
    }

    private function stats(): array
    {
        $active = Subscription::where('status', 'active');

        return [
            'mrr'              => (clone $active)->sum('amount'),
            'active_subs'      => User::count(),
            'paying_customers' => (clone $active)->count(),
            'churned'          => Subscription::where('status', 'canceled')->count(),
        ];
    }
}
