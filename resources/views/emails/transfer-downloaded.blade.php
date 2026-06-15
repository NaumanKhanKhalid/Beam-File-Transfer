@php
    $link = url('/r/' . $transfer->slug);
    $count = $transfer->download_count;
@endphp
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F2F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0E0F12;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F4F6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #ECEEF1;">
        {{-- Header --}}
        <tr><td style="background:#0E0F12;padding:22px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;">
              <span style="display:inline-block;width:30px;height:30px;border-radius:8px;background:#C6FF3D;text-align:center;line-height:30px;font-weight:800;color:#0E0F12;">B</span>
            </td>
            <td style="vertical-align:middle;padding-left:10px;font-size:19px;font-weight:700;color:#ffffff;letter-spacing:-.02em;">Beam</td>
          </tr></table>
        </td></tr>

        {{-- Body --}}
        <tr><td style="padding:32px 28px 8px;">
          <div style="display:inline-block;background:#E7F8EF;color:#0F7E49;font-size:12px;font-weight:700;padding:5px 12px;border-radius:999px;letter-spacing:.04em;">DOWNLOADED</div>
          <h1 style="margin:16px 0 6px;font-size:23px;line-height:1.25;letter-spacing:-.02em;color:#0E0F12;">Your transfer was just downloaded</h1>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#6B7280;">
            Someone opened <strong style="color:#0E0F12;">{{ $transfer->title }}</strong> and downloaded
            <strong style="color:#0E0F12;">{{ $file->name }}</strong>.
          </p>
        </td></tr>

        {{-- Detail card --}}
        <tr><td style="padding:20px 28px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;border:1px solid #ECEEF1;border-radius:12px;">
            <tr><td style="padding:16px 18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#0E0F12;">
                <tr><td style="padding:4px 0;color:#6B7280;">Transfer</td><td align="right" style="padding:4px 0;font-weight:600;">{{ $transfer->title }}</td></tr>
                <tr><td style="padding:4px 0;color:#6B7280;">File</td><td align="right" style="padding:4px 0;font-weight:600;">{{ $file->name }}</td></tr>
                <tr><td style="padding:4px 0;color:#6B7280;">Total downloads</td><td align="right" style="padding:4px 0;font-weight:600;">{{ $count }}</td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        {{-- CTA --}}
        <tr><td style="padding:24px 28px 32px;">
          <a href="{{ $link }}" style="display:inline-block;background:#C6FF3D;color:#0E0F12;font-size:15px;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:999px;">View transfer</a>
          <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#9AA1AC;">
            You’re getting this because “Notify on download” was on for this transfer.
            Turn it off any time from the send screen.
          </p>
        </td></tr>
      </table>
      <p style="margin:18px 0 0;font-size:12px;color:#9AA1AC;">Beam — send big, then it’s gone.</p>
    </td></tr>
  </table>
</body>
</html>
