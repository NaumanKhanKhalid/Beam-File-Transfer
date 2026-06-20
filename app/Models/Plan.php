<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    protected $fillable = [
        'key', 'name', 'tagline', 'monthly', 'yearly', 'max_bytes',
        'expiry_minutes', 'expiry_days', 'download_limit', 'file_limit',
        'branding', 'popular', 'features', 'sort',
    ];

    protected $casts = [
        'monthly'        => 'int',
        'yearly'         => 'int',
        'max_bytes'      => 'int',
        'expiry_minutes' => 'int',
        'expiry_days'    => 'int',
        'download_limit' => 'int',
        'file_limit'     => 'int',
        'branding'       => 'bool',
        'popular'        => 'bool',
        'features'       => 'array',
        'sort'           => 'int',
    ];
}
