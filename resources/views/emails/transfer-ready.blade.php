@php
    $count   = $transfer->files->count();
    $sender  = $transfer->sender_name ?: 'Someone';
    $initials = collect(preg_split('/\s+/', trim($sender)))->filter()->take(2)->map(fn ($w) => mb_strtoupper(mb_substr($w, 0, 1)))->join('') ?: 'B';
    $human = function ($b) {
        $b = (int) $b; if ($b <= 0) return '0 B';
        $u = ['B', 'KB', 'MB', 'GB', 'TB']; $i = (int) floor(log($b, 1024));
        return round($b / (1024 ** $i), $i ? 1 : 0) . ' ' . $u[$i];
    };
    $total = $transfer->files->sum('size_bytes');
    // Brand-ish color per file kind for the little type badge.
    $kindColor = ['image' => '#18B368', 'video' => '#4B3AFF', 'audio' => '#F5A524', 'pdf' => '#F4384F', 'doc' => '#2C20B0', 'zip' => '#6B7280'];
    $ext = fn ($n) => strtoupper(substr(strrchr($n, '.') ?: 'FILE', 1, 4) ?: 'FILE');
@endphp
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F2F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0E0F12;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F4F6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #ECEEF1;box-shadow:0 1px 2px rgba(16,17,21,.04);">

        {{-- Header --}}
        <tr><td style="background:#0E0F12;padding:20px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;"><span style="display:inline-block;width:30px;height:30px;border-radius:8px;background:#C6FF3D;text-align:center;line-height:30px;font-weight:800;color:#0E0F12;font-size:16px;">B</span></td>
            <td style="vertical-align:middle;padding-left:10px;font-size:19px;font-weight:700;color:#ffffff;letter-spacing:-.02em;">Beam</td>
          </tr></table>
        </td></tr>

        {{-- Greeting: sender avatar + headline + meta --}}
        <tr><td style="padding:30px 28px 0;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;">
              <span style="display:inline-block;width:44px;height:44px;border-radius:999px;background:#4B3AFF;color:#fff;text-align:center;line-height:44px;font-weight:700;font-size:16px;">{{ $initials }}</span>
            </td>
            <td style="vertical-align:middle;padding-left:14px;">
              <div style="font-size:20px;font-weight:700;letter-spacing:-.02em;line-height:1.25;color:#0E0F12;">{{ $sender }} sent you {{ $count }} file{{ $count === 1 ? '' : 's' }}</div>
              <div style="font-size:13px;color:#9AA1AC;margin-top:2px;">{{ $count }} file{{ $count === 1 ? '' : 's' }} · {{ $human($total) }}@if($transfer->expires_at) · expires {{ $transfer->expires_at->diffForHumans(['parts' => 1]) }}@endif</div>
            </td>
          </tr></table>
        </td></tr>

        {{-- Optional message --}}
        @if ($transfer->message)
        <tr><td style="padding:18px 28px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;border-left:3px solid #C6FF3D;border-radius:8px;">
            <tr><td style="padding:12px 16px;font-size:14px;line-height:1.55;color:#3A4049;">“{{ $transfer->message }}”</td></tr>
          </table>
        </td></tr>
        @endif

        {{-- File list with type badges --}}
        <tr><td style="padding:20px 28px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ECEEF1;border-radius:14px;">
            @foreach ($transfer->files->take(8) as $i => $f)
              <tr>
                <td style="padding:12px 16px;{{ $i ? 'border-top:1px solid #F1F3F5;' : '' }}">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                    <td style="vertical-align:middle;width:38px;">
                      <span style="display:inline-block;width:34px;height:34px;border-radius:9px;background:{{ $kindColor[$f->kind] ?? '#2E333C' }};color:#fff;text-align:center;line-height:34px;font-size:9px;font-weight:700;letter-spacing:.03em;">{{ $ext($f->name) }}</span>
                    </td>
                    <td style="vertical-align:middle;padding-left:12px;font-size:14px;font-weight:600;color:#0E0F12;word-break:break-word;">{{ $f->name }}</td>
                    <td align="right" style="vertical-align:middle;font-size:12px;color:#9AA1AC;white-space:nowrap;padding-left:10px;">{{ $human($f->size_bytes) }}</td>
                  </tr></table>
                </td>
              </tr>
            @endforeach
            @if ($count > 8)
              <tr><td style="padding:11px 16px;border-top:1px solid #F1F3F5;font-size:13px;color:#9AA1AC;">+ {{ $count - 8 }} more file{{ $count - 8 === 1 ? '' : 's' }}…</td></tr>
            @endif
          </table>
        </td></tr>

        {{-- Access code (only when password protected) --}}
        @if ($code)
        <tr><td style="padding:16px 28px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0E0F12;border-radius:14px;">
            <tr><td style="padding:15px 18px;">
              <div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6B7280;">Access code</div>
              <div style="font-family:'Courier New',monospace;font-size:24px;font-weight:700;letter-spacing:.25em;color:#C6FF3D;margin-top:2px;">{{ $code }}</div>
              <div style="font-size:11px;color:#6B7280;margin-top:4px;">Enter this to unlock the files.</div>
            </td></tr>
          </table>
        </td></tr>
        @endif

        {{-- CTA --}}
        <tr><td align="center" style="padding:26px 28px 8px;">
          <a href="{{ $link }}" style="display:inline-block;background:#C6FF3D;color:#0E0F12;font-size:16px;font-weight:700;text-decoration:none;padding:15px 40px;border-radius:999px;box-shadow:0 6px 18px rgba(198,255,61,.45);">Get your files →</a>
        </td></tr>
        <tr><td style="padding:8px 28px 30px;">
          <p style="margin:14px 0 0;font-size:12px;line-height:1.6;color:#9AA1AC;text-align:center;">
            @if ($transfer->expires_at) This link expires {{ $transfer->expires_at->diffForHumans() }}.<br>@endif
            Button not working? Paste this link:<br>
            <a href="{{ $link }}" style="color:#4B3AFF;word-break:break-all;">{{ $link }}</a>
          </p>
        </td></tr>
      </table>

      {{-- Footer --}}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td align="center" style="padding:18px 0 0;font-size:12px;color:#9AA1AC;">
          <strong style="color:#6B7280;">Beam</strong> — send big, then it’s gone.
        </td></tr>
      </table>

    </td></tr>
  </table>
</body>
</html>
