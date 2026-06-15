<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Resumable chunked uploads (a small tus-style protocol).
 *
 *  GET  /api/uploads/status?upload_id=&key=   → { received } bytes already stored
 *  POST /api/uploads/chunk  (multipart)       → append one chunk at `offset`
 *
 * The client streams each file as sequential chunks under a client-generated
 * `upload_id` + per-file `key`. Chunks are appended to a temp file; if the
 * connection drops, the client calls /status and resumes from `received`.
 * TransferController@commit then assembles the parts into the real transfer.
 *
 * No auth required (guests upload too); the quota is enforced at commit time.
 */
class ChunkUploadController extends Controller
{
    /** How much of this file the server already has — lets the client resume. */
    public function status(Request $request): JsonResponse
    {
        $data = $request->validate([
            'upload_id' => ['required', 'string', 'regex:/^[A-Za-z0-9_-]{8,64}$/'],
            'key'       => ['required', 'string', 'regex:/^[A-Za-z0-9_-]{1,80}$/'],
        ]);
        $part = "chunks/{$data['upload_id']}/{$data['key']}";
        return response()->json(['received' => Storage::exists($part) ? Storage::size($part) : 0]);
    }

    /** Append a single chunk at `offset`. Returns the new received-bytes total. */
    public function chunk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'upload_id' => ['required', 'string', 'regex:/^[A-Za-z0-9_-]{8,64}$/'],
            'key'       => ['required', 'string', 'regex:/^[A-Za-z0-9_-]{1,80}$/'],
            'offset'    => ['required', 'integer', 'min:0'],
            'chunk'     => ['required', 'file'],
        ]);

        $dir  = "chunks/{$data['upload_id']}";
        $part = "{$dir}/{$data['key']}";
        $current = Storage::exists($part) ? Storage::size($part) : 0;

        // Sequential-append contract: reject out-of-order/duplicate chunks so the
        // client can re-sync from /status (idempotent, safe on flaky networks).
        if ((int) $data['offset'] !== $current) {
            return response()->json([
                'message'  => 'Offset mismatch — resync and resend.',
                'received' => $current,
            ], 409);
        }

        Storage::makeDirectory($dir);
        $abs = Storage::path($part);
        $in  = fopen($request->file('chunk')->getRealPath(), 'rb');
        $out = fopen($abs, 'ab');
        stream_copy_to_stream($in, $out);
        fclose($in);
        fclose($out);

        return response()->json(['received' => Storage::size($part)]);
    }
}
