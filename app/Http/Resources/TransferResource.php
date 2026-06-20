<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransferResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'slug'           => $this->slug,
            'title'          => $this->title,
            'message'        => $this->message,
            'sender_name'    => $this->sender_name,
            'recipients'     => $this->recipients ?? [],
            'protected'      => $this->isProtected(),
            'burn'           => $this->burn_after_download,
            'notify'         => $this->notify_on_download,
            'total_bytes'    => $this->total_bytes,
            'files_count'    => $this->whenCounted('files'),
            'download_count' => $this->download_count,
            'expires_at'     => optional($this->expires_at)->toIso8601String(),
            'expired'        => $this->isExpired(),
            'burned'         => $this->isBurned(),
            // Whether this server can build a single .zip (needs ext-zip or the
            // ZipStream library). Lets the recipient page decide upfront between a
            // one-click ZIP and downloading files individually.
            'zip_available'  => class_exists(\ZipStream\ZipStream::class) || class_exists(\ZipArchive::class),
            'brand'          => $this->brand,
            'link'           => url("/r/{$this->slug}"),
            'files'          => TransferFileResource::collection($this->whenLoaded('files')),
            'created_at'     => $this->created_at->toIso8601String(),
        ];
    }
}
