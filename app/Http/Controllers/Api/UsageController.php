<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\Quota;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsageController extends Controller
{
    /**
     * GET /api/usage — how much storage the current sender has used and their cap.
     * Public: works for guests (metered by IP) and signed-in users (by account).
     */
    public function show(Request $request): JsonResponse
    {
        return response()->json(Quota::for($request));
    }
}
