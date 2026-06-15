<?php

namespace App\Console\Commands;

use App\Models\Transfer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Frees disk by deleting the stored files of transfers that are no longer
 * reachable — expired (past expires_at) or burned (burned_at set). The transfer
 * ROW is kept so the sender's dashboard still shows it as "Expired/Burned"; only
 * the heavy file blobs (and their DB rows) are removed.
 *
 * Scheduled hourly in routes/console.php. Run manually with:  php artisan beam:prune
 */
class PruneTransfers extends Command
{
    protected $signature = 'beam:prune {--dry-run : List what would be pruned without deleting}';
    protected $description = 'Delete stored files of expired or burned transfers to reclaim disk';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');

        // Transfers that are gone AND still have files on disk to clean up.
        $stale = Transfer::query()
            ->whereHas('files')
            ->where(function ($q) {
                $q->whereNotNull('burned_at')
                  ->orWhere('expires_at', '<', now());
            })
            ->with('files')
            ->get();

        if ($stale->isEmpty()) {
            $this->info('Nothing to prune.');
            return self::SUCCESS;
        }

        $files = 0;
        $bytes = 0;
        foreach ($stale as $transfer) {
            foreach ($transfer->files as $file) {
                $bytes += (int) $file->size_bytes;
                $files++;
                if (! $dry) {
                    Storage::delete($file->storage_path);
                    $file->delete();
                }
            }
            // Whole transfer directory (covers any stragglers).
            if (! $dry) {
                Storage::deleteDirectory("transfers/{$transfer->id}");
            }
        }

        $mb = number_format($bytes / 1048576, 1);
        $this->info(($dry ? '[dry-run] would free ' : 'Freed ') . "{$files} file(s), {$mb} MB across {$stale->count()} transfer(s).");

        return self::SUCCESS;
    }
}
