<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * Quick SMTP sanity check — sends a tiny test email so you can confirm the
 * mail config in .env works before relying on verify / reset / download alerts.
 *
 *   php artisan beam:mail-test you@example.com
 */
class MailTest extends Command
{
    protected $signature = 'beam:mail-test {to : Recipient email address}';
    protected $description = 'Send a test email to verify SMTP settings';

    public function handle(): int
    {
        $to = $this->argument('to');
        $this->info("Mailer: " . config('mail.default') . " · host: " . config('mail.mailers.smtp.host'));
        $this->info("Sending test email to {$to} …");

        try {
            Mail::raw(
                "This is a Beam test email. If you're reading this, your SMTP settings work. 🎉",
                fn ($m) => $m->to($to)->subject('Beam SMTP test')
            );
        } catch (\Throwable $e) {
            $this->error('Failed: ' . $e->getMessage());
            $this->line('Tips: run `php artisan config:clear`, check MAIL_USERNAME/MAIL_PASSWORD (16-char app password, no spaces), and that 2-Step Verification is on.');
            return self::FAILURE;
        }

        $this->info(config('mail.default') === 'log'
            ? 'Done — MAIL_MAILER=log, so it was written to storage/logs/laravel.log (no real email sent).'
            : 'Sent! Check the inbox (and spam) for "Beam SMTP test".');
        return self::SUCCESS;
    }
}
