<?php

namespace App\Support;

use App\Models\Transfer;
use App\Support\PlanRepo;
use Illuminate\Http\Request;

/**
 * Storage-quota accounting — the single source of truth for "how much has this
 * sender used, and what's their cap".
 *
 *  • Signed-in users  → metered by user_id against their plan's max_bytes.
 *  • Guests           → metered by sender IP against the Free cap, so the
 *                       allowance survives refresh / new tabs / incognito and
 *                       can only be reset by actually freeing transfers.
 *
 * Used by UsageController (GET /api/usage) and TransferController@store
 * (enforcement) so the meter the UI shows and the limit the server enforces
 * are always the same number.
 */
class Quota
{
    public static function for(Request $request): array
    {
        // Resolve a bearer token even on public routes (no route middleware needed).
        $user = auth('sanctum')->user();

        if ($user) {
            $plan = $user->plan ?: 'free';
            $cap  = (int) PlanRepo::get($plan, 'max_bytes', PlanRepo::get('free', 'max_bytes'));
            $used = (int) Transfer::where('user_id', $user->id)->sum('total_bytes');
            $scope = 'user';
        } else {
            $plan = 'guest';
            $cap  = (int) PlanRepo::get('free', 'max_bytes');
            $used = (int) Transfer::whereNull('user_id')
                ->where('sender_ip', $request->ip())
                ->sum('total_bytes');
            $scope = 'guest';
        }

        $remaining = max(0, $cap - $used);

        return [
            'scope'     => $scope,        // 'user' | 'guest'
            'plan'      => $plan,         // free | pro | business | guest
            'used'      => $used,         // bytes used
            'cap'       => $cap,          // bytes allowed
            'remaining' => $remaining,    // bytes left
            'exceeded'  => $remaining <= 0,
        ];
    }
}
