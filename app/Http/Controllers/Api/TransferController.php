<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTransferRequest;
use App\Http\Resources\TransferResource;
use App\Mail\TransferDownloadedMail;
use App\Mail\TransferReadyMail;
use App\Models\GuestPass;
use App\Models\Transfer;
use App\Support\Quota;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TransferController extends Controller
{
    /** GET /api/transfers — the sender's transfers (signed-in by account, guest by IP). */
    public function index(Request $request)
    {
        $transfers = $this->ownerScope($request)
            ->withCount('files')
            ->latest()
            ->paginate(20);

        return TransferResource::collection($transfers);
    }

    /**
     * GET /api/transfers/stats — headline numbers for the Transfers dashboard.
     * Scoped the same way as the list: by user_id when signed in, else by IP.
     */
    public function stats(Request $request): JsonResponse
    {
        $base = fn () => $this->ownerScope($request);

        return response()->json([
            'active'          => (int) $base()->where('expires_at', '>', now())->whereNull('burned_at')->count(),
            'downloads_week'  => (int) $base()->where('created_at', '>=', now()->subWeek())->sum('download_count'),
            'data_sent_bytes' => (int) $base()->sum('total_bytes'),
            'total'           => (int) $base()->count(),
        ]);
    }

    /** Transfers belonging to the current sender — by account, or by IP for guests. */
    private function ownerScope(Request $request)
    {
        $user = auth('sanctum')->user();

        return $user
            ? $user->transfers()->getQuery()
            : Transfer::whereNull('user_id')->where('sender_ip', $request->ip());
    }

    /** POST /api/transfers — create a transfer and store its files. */
    public function store(StoreTransferRequest $request): JsonResponse
    {
        $user  = auth('sanctum')->user();   // resolve bearer token on this public route (null = guest)
        $files = $request->file('files');
        $paths = $request->input('paths', []);   // optional folder-relative names, aligned with $files

        // One-time guest pass: a guest may send only once per IP, ever.
        if (! $user && $resp = $this->guestPassGuard($request)) return $resp;

        // Reject if this upload would push the sender over their quota.
        $incoming = collect($files)->sum(fn ($f) => $f->getSize());
        if ($resp = $this->quotaGuard($request, $user, $incoming)) return $resp;

        $transfer = $this->makeTransfer($request, $user,
            count($files) === 1 ? $files[0]->getClientOriginalName() : count($files) . ' files');

        $total = 0;
        foreach ($files as $i => $file) {
            $path = $file->store("transfers/{$transfer->id}");
            $transfer->files()->create([
                'name'         => $paths[$i] ?? $file->getClientOriginalName(),   // keep "folder/sub/file.ext" if sent
                'kind'         => $this->kindFor($file->getClientOriginalName()),
                'size_bytes'   => $file->getSize(),
                'storage_path' => $path,
                'mime'         => $file->getMimeType(),
            ]);
            $total += $file->getSize();
        }
        $transfer->update(['total_bytes' => $total]);
        if (! $user) GuestPass::burn($request->ip());   // spend the one-time guest pass
        $this->notifyRecipients($transfer, $request->input('password'));

        return (new TransferResource($transfer->load('files')))
            ->response()->setStatusCode(201);
    }

    /**
     * POST /api/transfers/commit — finalize a chunked/resumable upload.
     * The client has already streamed each file to /api/uploads/chunk under an
     * upload_id; here we assemble them into a transfer (same quota, expiry,
     * password, branding and notify rules as a normal upload).
     */
    public function commit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'upload_id'   => ['required', 'string', 'regex:/^[A-Za-z0-9_-]{8,64}$/'],
            'files'       => ['required', 'array', 'min:1', 'max:500'],
            'files.*.key' => ['required', 'string', 'regex:/^[A-Za-z0-9_-]{1,80}$/'],
            'files.*.name'=> ['required', 'string', 'max:1024'],
        ]);

        $user = auth('sanctum')->user();
        $dir  = "chunks/{$data['upload_id']}";

        // One-time guest pass: a guest may send only once per IP, ever.
        if (! $user && $resp = $this->guestPassGuard($request)) { Storage::deleteDirectory($dir); return $resp; }

        // Verify every assembled part exists, and total their sizes for the quota.
        $specs = [];
        foreach ($data['files'] as $f) {
            $part = "{$dir}/{$f['key']}";
            if (! Storage::exists($part)) {
                return response()->json(['message' => "Upload for “{$f['name']}” is incomplete — please retry.", 'code' => 'chunk_missing'], 422);
            }
            $specs[] = ['part' => $part, 'name' => $f['name'], 'size' => Storage::size($part)];
        }

        $incoming = array_sum(array_column($specs, 'size'));
        if ($resp = $this->quotaGuard($request, $user, $incoming)) { Storage::deleteDirectory($dir); return $resp; }

        $transfer = $this->makeTransfer($request, $user,
            count($specs) === 1 ? $specs[0]['name'] : count($specs) . ' files');

        $total = 0;
        foreach ($specs as $s) {
            $dest = "transfers/{$transfer->id}/" . \Illuminate\Support\Str::random(40);
            Storage::move($s['part'], $dest);
            $transfer->files()->create([
                'name'         => $s['name'],
                'kind'         => $this->kindFor($s['name']),
                'size_bytes'   => $s['size'],
                'storage_path' => $dest,
                'mime'         => null,
            ]);
            $total += $s['size'];
        }
        Storage::deleteDirectory($dir);   // clean the temp chunk folder
        $transfer->update(['total_bytes' => $total]);
        if (! $user) GuestPass::burn($request->ip());   // spend the one-time guest pass
        $this->notifyRecipients($transfer, $request->input('password'));

        return (new TransferResource($transfer->load('files')))
            ->response()->setStatusCode(201);
    }

    /**
     * Email the transfer link to each recipient ("Send email" mode). The plain
     * access code is passed through here only — it's never stored unhashed.
     * Best-effort per address so one bad email can't fail the whole transfer.
     */
    private function notifyRecipients(Transfer $transfer, ?string $password = null): void
    {
        $recipients = collect($transfer->recipients ?? [])
            ->filter(fn ($e) => filter_var($e, FILTER_VALIDATE_EMAIL))
            ->unique()
            ->values();
        if ($recipients->isEmpty()) return;

        $transfer->loadMissing('files');
        $link = url('/r/' . $transfer->slug);
        foreach ($recipients as $email) {
            try {
                Mail::to($email)->send(new TransferReadyMail($transfer, $link, $password ?: null));
            } catch (\Throwable $e) {
                report($e);
            }
        }
    }

    /** 422 quota response if this upload exceeds the sender's remaining bytes, else null. */
    private function quotaGuard(Request $request, $user, int $incoming): ?JsonResponse
    {
        $quota = Quota::for($request);
        if ($incoming > $quota['remaining']) {
            return response()->json([
                'message' => $user
                    ? 'You’ve reached your plan’s storage limit. Upgrade to send more.'
                    : 'You’ve used your 2 GB free guest limit. Create a free account to keep sending.',
                'code'  => $user ? 'quota_exceeded' : 'guest_quota_exceeded',
                'usage' => $quota,
            ], 422);
        }
        return null;
    }

    /** 422 if this guest IP has already spent its one free send, else null. */
    private function guestPassGuard(Request $request): ?JsonResponse
    {
        if (GuestPass::spent($request->ip())) {
            return response()->json([
                'message' => 'You’ve already used your one free guest send. Create a free account to keep sending — it’s unlimited.',
                'code'    => 'guest_used',
            ], 422);
        }
        return null;
    }

    /** Create the Transfer row from request options (shared by store + commit). */
    private function makeTransfer(Request $request, $user, string $titleFallback): Transfer
    {
        // Expiry — resolve the token to a timestamp, clamped to the plan's max
        // (now stored in minutes; 'forever' only if the plan allows unlimited).
        $plan      = $user ? ($user->plan ?: 'free') : 'free';
        $expiresAt = Transfer::resolveExpiry($plan, $request->input('expiry', '7d'));

        return Transfer::create([
            'user_id'             => $user?->id,
            'sender_ip'           => $request->ip(),
            'slug'                => Transfer::makeSlug($user?->name),
            'title'               => $request->input('title') ?: $titleFallback,
            'message'             => $request->input('message'),
            'sender_name'         => $user?->name ?? ($request->input('sender_name') ?: 'Guest'),
            'recipients'          => $request->input('recipients', []),
            'password_hash'       => $request->filled('password') ? Hash::make($request->input('password')) : null,
            'burn_after_download' => $request->boolean('burn'),
            'notify_on_download'  => $request->boolean('notify', true),
            'expires_at'          => $expiresAt,
            'download_limit'      => \App\Support\PlanRepo::get($plan, 'download_limit'),   // null = unlimited
            'brand'               => ($request->boolean('branded') && $user?->brand_enabled)
                ? ['name' => $user->brand_name, 'accent' => $user->brand_accent,
                   'logo' => $user->brand_logo_path ? asset('storage/' . $user->brand_logo_path) : null]
                : null,
        ]);
    }

    /** DELETE /api/transfers/{transfer} — owner (account) or the guest who sent it (by IP). */
    public function destroy(Request $request, Transfer $transfer): JsonResponse
    {
        $user = auth('sanctum')->user();
        $owns = $user
            ? $transfer->user_id === $user->id
            : ($transfer->user_id === null && $transfer->sender_ip === $request->ip());
        abort_unless($owns, 403);

        Storage::deleteDirectory("transfers/{$transfer->id}");
        $transfer->delete();

        return response()->json(['message' => 'Transfer deleted.']);
    }

    /**
     * GET /api/t/{slug} — public recipient view (no auth).
     * Returns metadata only; file list is hidden until unlocked if protected.
     */
    public function show(string $slug)
    {
        $transfer = Transfer::where('slug', $slug)->with('files')->firstOrFail();

        if ($transfer->isExpired()) {
            return response()->json(['message' => 'This transfer has expired.'], 410);
        }
        if ($transfer->isBurned()) {
            return response()->json(['message' => 'This transfer was deleted after download.'], 410);
        }

        // Hide the file list (and download links) until the code is verified.
        if ($transfer->isProtected()) {
            $transfer->setRelation('files', $transfer->files->take(0));
        }

        return new TransferResource($transfer);
    }

    /** POST /api/t/{slug}/unlock — verify the access code, return files. */
    public function unlock(Request $request, string $slug)
    {
        $request->validate(['password' => ['required', 'string']]);

        $transfer = Transfer::where('slug', $slug)->with('files')->firstOrFail();

        // Brute-force guard: max 6 wrong tries per code+IP per 10 minutes.
        $key = 'unlock:' . $slug . ':' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 6)) {
            $secs = RateLimiter::availableIn($key);
            return response()->json([
                'message' => 'Too many attempts. Try again in ' . ceil($secs / 60) . ' min.',
            ], 429);
        }

        if (! $transfer->isProtected() || ! Hash::check($request->password, $transfer->password_hash)) {
            RateLimiter::hit($key, 600);   // remember this failure for 10 minutes
            return response()->json(['message' => 'Incorrect access code.'], 422);
        }

        RateLimiter::clear($key);          // success — reset the counter
        return new TransferResource($transfer);
    }

    /**
     * GET /api/t/{slug}/zip — stream every file in one .zip.
     * Same gate as single-file download (expired/burned only); counts as one download.
     */
    public function zip(string $slug): \Symfony\Component\HttpFoundation\BinaryFileResponse
    {
        $transfer = Transfer::where('slug', $slug)->with('files')->firstOrFail();
        abort_if($transfer->isExpired() || $transfer->isBurned(), 410);
        abort_if($transfer->download_limit !== null && $transfer->download_count >= $transfer->download_limit, 410, 'This transfer has reached its download limit.');
        abort_if($transfer->files->isEmpty(), 404);

        $tmp = tempnam(sys_get_temp_dir(), 'beamzip');
        $zip = new \ZipArchive();
        $zip->open($tmp, \ZipArchive::OVERWRITE);
        foreach ($transfer->files as $f) {
            $abs = Storage::path($f->storage_path);
            if (is_file($abs)) {
                $zip->addFile($abs, $f->name);   // $f->name keeps folder paths (e.g. "deck/logo.png")
            }
        }
        $zip->close();

        $transfer->increment('download_count');
        if ($transfer->burn_after_download && ! $transfer->isBurned()) {
            $transfer->update(['burned_at' => now()]);
        }
        try { event(new \App\Events\TransferDownloaded($transfer->refresh())); } catch (\Throwable $e) { /* no-op */ }

        $zipName = (\Illuminate\Support\Str::slug($transfer->title ?: 'beam-transfer') ?: 'beam-transfer') . '.zip';
        return response()->download($tmp, $zipName, ['Content-Type' => 'application/zip'])->deleteFileAfterSend(true);
    }

    /** GET /api/t/{slug}/files/{file} — stream a single file download. */
    public function download(string $slug, int $fileId): StreamedResponse
    {
        $transfer = Transfer::where('slug', $slug)->firstOrFail();
        abort_if($transfer->isExpired() || $transfer->isBurned(), 410);
        abort_if($transfer->download_limit !== null && $transfer->download_count >= $transfer->download_limit, 410, 'This transfer has reached its download limit.');

        $file = $transfer->files()->findOrFail($fileId);

        // Count + honour burn-after-download.
        $transfer->increment('download_count');
        if ($transfer->burn_after_download && ! $transfer->isBurned()) {
            $transfer->update(['burned_at' => now()]);
            // Files are removed by a queued job/scheduler in production.
        }

        // Notify the sender by email if they asked for it (signed-in senders only —
        // guests have no stored address). Best-effort: never block the download.
        if ($transfer->notify_on_download && $transfer->user?->email) {
            try {
                Mail::to($transfer->user->email)->send(new TransferDownloadedMail($transfer->refresh(), $file));
            } catch (\Throwable $e) {
                report($e);
            }
        }

        // Push the new count to the sender's dashboard in real time (Reverb).
        // Best-effort: if broadcasting isn't configured this is a no-op and the
        // dashboard's polling still catches up.
        try {
            event(new \App\Events\TransferDownloaded($transfer->refresh()));
        } catch (\Throwable $e) {
            // ignore — never let broadcasting break a download
        }

        return Storage::download($file->storage_path, $file->name);
    }

    private function kindFor(string $name): string
    {
        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));

        return match (true) {
            in_array($ext, ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v']) => 'video',
            in_array($ext, ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic']) => 'image',
            in_array($ext, ['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg']) => 'audio',
            $ext === 'pdf' => 'pdf',
            in_array($ext, ['doc', 'docx', 'txt', 'ppt', 'pptx', 'xls', 'xlsx', 'csv']) => 'doc',
            in_array($ext, ['zip', 'rar', '7z', 'tar', 'gz']) => 'zip',
            default => 'default',
        };
    }
}
