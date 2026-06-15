<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plan extends Model
{
    protected $fillable = [
        'key', 'name', 'monthly', 'yearly', 'max_bytes', 'expiry_days', 'branding', 'sort',
    ];

    protected $casts = [
        'monthly'     => 'int',
        'yearly'      => 'int',
        'max_bytes'   => 'int',
        'expiry_days' => 'int',
        'branding'    => 'bool',
        'sort'        => 'int',
    ];
}
