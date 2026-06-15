<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransferFile extends Model
{
    protected $fillable = [
        'transfer_id', 'name', 'kind', 'size_bytes', 'storage_path', 'mime',
    ];

    protected $hidden = ['storage_path'];

    public function transfer(): BelongsTo
    {
        return $this->belongsTo(Transfer::class);
    }
}
