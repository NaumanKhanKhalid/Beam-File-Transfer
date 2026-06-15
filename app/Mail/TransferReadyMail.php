<?php

namespace App\Mail;

use App\Models\Transfer;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Sent to each recipient when a transfer is created in "Send email" mode — the
 * actual "here are your files" email with the link (and access code if set).
 * Plain Mailable so it works with MAIL_MAILER=log in dev; switch to smtp + a
 * queue for production.
 */
class TransferReadyMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Transfer $transfer,
        public string $link,
        public ?string $code = null,
    ) {}

    public function envelope(): Envelope
    {
        $who = $this->transfer->sender_name ?: 'Someone';
        return new Envelope(subject: "{$who} sent you files on Beam");
    }

    public function content(): Content
    {
        return new Content(view: 'emails.transfer-ready');
    }
}
