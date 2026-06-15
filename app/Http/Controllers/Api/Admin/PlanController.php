<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Support\PlanRepo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin plan management — read, create, edit & delete plans (DB-backed).
 * Guarded by the `admin` middleware. All changes flow through PlanRepo, so the
 * public /plans, upgrade page, quota and expiry clamping reflect them.
 */
class PlanController extends Controller
{
    private array $rules = [
        'name'        => ['required', 'string', 'max:40'],
        'monthly'     => ['required', 'numeric', 'min:0', 'max:100000000'],
        'yearly'      => ['required', 'numeric', 'min:0', 'max:100000000'],
        'max_bytes'   => ['required', 'numeric', 'min:0'],
        'expiry_days' => ['required', 'integer', 'min:1', 'max:36500'],
        'branding'    => ['sometimes', 'boolean'],
    ];

    public function index(): JsonResponse
    {
        return response()->json(['plans' => PlanRepo::all()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules);
        PlanRepo::create($data);
        return response()->json(['plans' => PlanRepo::all()], 201);
    }

    public function update(Request $request, string $key): JsonResponse
    {
        $data = $request->validate($this->rules);
        if (! PlanRepo::update($key, $data)) {
            return response()->json(['message' => 'Plan not found.'], 404);
        }
        return response()->json(['plans' => PlanRepo::all()]);
    }

    public function destroy(string $key): JsonResponse
    {
        PlanRepo::delete($key);
        return response()->json(['plans' => PlanRepo::all()]);
    }
}
