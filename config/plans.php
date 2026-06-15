<?php

/**
 * Plan catalogue — single source of truth for pricing & limits.
 * Mirror these values in the frontend (api.js / PLANS) so the UI and
 * server agree. Amounts are the monthly price you charge, in INR.
 */
return [
    'free' => [
        'name'        => 'Free',
        'monthly'     => 0,
        'yearly'      => 0,
        'max_bytes'   => 2 * 1024 * 1024 * 1024,        // 2 GB per transfer
        'expiry_days' => 7,
        'branding'    => false,
    ],
    'pro' => [
        'name'        => 'Pro',
        'monthly'     => 749,
        'yearly'      => 599,                            // per month, billed yearly
        'max_bytes'   => 200 * 1024 * 1024 * 1024,       // 200 GB
        'expiry_days' => 365,
        'branding'    => true,
    ],
    'business' => [
        'name'        => 'Business',
        'monthly'     => 1899,
        'yearly'      => 1499,
        'max_bytes'   => 1024 * 1024 * 1024 * 1024,      // 1 TB
        'expiry_days' => 3650,
        'branding'    => true,
    ],
];
