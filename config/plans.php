<?php

/**
 * Plan catalogue — single source of truth for pricing, limits & marketing copy.
 * Seeds the DB-backed `plans` table on first use; admins edit from there.
 * Amounts are the monthly price you charge, in INR. expiry_minutes is the link
 * lifetime (null = unlimited); download_limit caps downloads per transfer
 * (null = unlimited); features is the bullet list shown on the upgrade page.
 */
return [
    'free' => [
        'name'           => 'Free',
        'tagline'        => 'For the occasional send',
        'monthly'        => 0,
        'yearly'         => 0,
        'max_bytes'      => 2 * 1024 * 1024 * 1024,         // 2 GB per transfer
        'expiry_minutes' => 7 * 1440,                        // 7 days
        'download_limit' => 20,                              // 20 downloads per transfer
        'file_limit'     => 20,                              // up to 20 files per transfer
        'branding'       => false,
        'popular'        => false,
        'features'       => [
            '2 GB per transfer',
            '7-day link expiry',
            'Up to 20 files per transfer',
            'Email, link & QR sharing',
            'Up to 20 downloads per transfer',
            'Encrypted transfers',
        ],
    ],
    'pro' => [
        'name'           => 'Pro',
        'tagline'        => 'For freelancers & creators',
        'monthly'        => 749,
        'yearly'         => 599,                             // per month, billed yearly
        'max_bytes'      => 200 * 1024 * 1024 * 1024,        // 200 GB
        'expiry_minutes' => 365 * 1440,                      // 1 year
        'download_limit' => null,                            // unlimited
        'file_limit'     => null,                             // unlimited
        'branding'       => true,
        'popular'        => true,
        'features'       => [
            'Everything in Free, plus:',
            '200 GB per transfer',
            '1-year link expiry',
            'Unlimited files & downloads',
            'Custom branding & logo',
            'Password protection',
            'Delete-after-download',
            'Live download tracking',
            'Priority email support',
        ],
    ],
    'business' => [
        'name'           => 'Business',
        'tagline'        => 'For teams & studios',
        'monthly'        => 1899,
        'yearly'         => 1499,
        'max_bytes'      => 1024 * 1024 * 1024 * 1024,       // 1 TB
        'expiry_minutes' => null,                            // unlimited
        'download_limit' => null,                            // unlimited
        'file_limit'     => null,                             // unlimited
        'branding'       => true,
        'popular'        => false,
        'features'       => [
            'Everything in Pro, plus:',
            '1 TB per transfer',
            'Unlimited link expiry',
            'Admin & member roles',
            'Custom domain (files.you.com)',
            'SSO + audit log',
            'Dedicated support',
        ],
    ],
];
