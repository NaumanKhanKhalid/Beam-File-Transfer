<?php

namespace App\Mail;

use App\Models\Transfer;
use App\Models\TransferFile;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent to the transfer's owner when a recipient downloads a file — but only when
 * the sender left "Notify on download" on. Plain Mailable (not queued) so it
 * works out of the box with the `log` mail driver in dev; switch MAIL_MAILER +
 * a queue in production.
 */
class TransferDownloadedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Transfer $transfer, public TransferFile $file) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Someone downloaded “' . $this->transfer->title . '”',
        );
    }

    public function content(): Content
    {
        return new Content(view: 'emails.transfer-downloaded');
    }
}
