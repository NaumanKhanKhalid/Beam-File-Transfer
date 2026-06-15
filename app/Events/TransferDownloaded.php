<?php

namespace App\Events;

use App\Models\Transfer;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Broadcast the instant a transfer is downloaded so the sender's dashboard
 * updates the download count in real time (no refresh, no polling lag).
 *
 * Public channel keyed by slug — works for guests AND signed-in senders without
 * channel authorization. ShouldBroadcastNow = pushed synchronously (no queue
 * worker needed for local/dev). Falls back to the page's 8s poll if Reverb
 * isn't running.
 */
class TransferDownloaded implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Transfer $transfer)
    {
    }

    public function broadcastOn(): Channel
    {
        return new Channel("transfer.{$this->transfer->slug}");
    }

    public function broadcastAs(): string
    {
        return 'downloaded';
    }

    public function broadcastWith(): array
    {
        return [
            'slug'           => $this->transfer->slug,
            'download_count' => (int) $this->transfer->download_count,
            'burned'         => $this->transfer->isBurned(),
        ];
    }
}
