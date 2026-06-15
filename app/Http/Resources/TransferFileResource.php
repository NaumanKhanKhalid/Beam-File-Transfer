<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransferFileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'         => $this->id,
            'name'       => $this->name,
            'kind'       => $this->kind,
            'size_bytes' => $this->size_bytes,
            'download'   => url("/api/t/{$this->transfer->slug}/files/{$this->id}"),
        ];
    }
}
