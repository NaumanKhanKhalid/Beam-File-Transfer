<?php

use Illuminate\Support\Facades\Schedule;

/*
 * Beam scheduled tasks. Make sure the system cron runs the Laravel scheduler:
 *   * * * * * cd /path/to/backend && php artisan schedule:run >> /dev/null 2>&1
 */

// Reclaim disk from expired / burned transfers every hour.
Schedule::command('beam:prune')->hourly()->withoutOverlapping();
