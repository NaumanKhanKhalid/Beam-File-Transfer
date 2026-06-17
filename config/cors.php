<?php

/**
 * CORS config for the Beam API.
 * --------------------------------------------------------------------------
 * Copy this to your Laravel app at: config/cors.php
 *
 * Beam uses Sanctum COOKIE/SESSION auth (same-origin SPA), so
 * `supports_credentials` is TRUE and the session + CSRF cookies are sent.
 * List every frontend origin under `allowed_origins`.
 *
 * IMPORTANT: an "origin" is scheme + host + port, e.g. http://localhost:5500
 * It must match EXACTLY. Opening the HTML as a file:// URL sends Origin "null"
 * and will be blocked — always serve the frontend over http (see notes below).
 * --------------------------------------------------------------------------
 */

return [

    // Apply CORS to API routes (and Sanctum's CSRF cookie route if you use it).
    'paths' => ['api/*', 'sanctum/csrf-cookie', 't/*'],

    // Which HTTP methods are allowed. '*' = all.
    'allowed_methods' => ['*'],

    // 🔑 List every origin your frontend is served from. Add your real
    //    production domain here when you deploy.
    'allowed_origins' => [
        'http://localhost:5500',   // VS Code "Live Server" default
        'http://127.0.0.1:5500',
        'http://localhost:8000',   // php -S / artisan serve serving the page
        'http://localhost:5173',   // Vite (when you move to React)
        // 'https://app.beam.to',  // ← production frontend
    ],

    // Or match dynamically with patterns instead of a fixed list:
    // 'allowed_origins_patterns' => ['/^http:\/\/localhost:\d+$/'],
    'allowed_origins_patterns' => [],

    // Request headers the browser may send. '*' covers Authorization, etc.
    'allowed_headers' => ['*'],

    // Response headers exposed to JS (usually none needed for Beam).
    'exposed_headers' => [],

    // Cache the preflight (OPTIONS) response, in seconds.
    'max_age' => 0,

    // TRUE so the browser sends the Sanctum session + CSRF cookies.
    'supports_credentials' => true,

];
