<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubscriptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                 => $this->id,
            'plan'               => $this->plan,
            'billing_cycle'      => $this->billing_cycle,
            'status'             => $this->status,
            'amount'             => $this->amount,
            'currency'           => $this->currency,
            'current_period_end' => optional($this->current_period_end)->toIso8601String(),
            'canceled_at'        => optional($this->canceled_at)->toIso8601String(),
        ];
    }
}
