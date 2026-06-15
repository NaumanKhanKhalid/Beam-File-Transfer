@php $name = $user->name ?? 'there'; @endphp
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F2F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0E0F12;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2F4F6;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #ECEEF1;">
        <tr><td style="background:#0E0F12;padding:22px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;"><span style="display:inline-block;width:30px;height:30px;border-radius:8px;background:#C6FF3D;text-align:center;line-height:30px;font-weight:800;color:#0E0F12;">B</span></td>
            <td style="vertical-align:middle;padding-left:10px;font-size:19px;font-weight:700;color:#ffffff;letter-spacing:-.02em;">Beam</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:32px 28px 8px;">
          <h1 style="margin:0 0 6px;font-size:23px;line-height:1.25;letter-spacing:-.02em;color:#0E0F12;">Reset your password</h1>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#6B7280;">Hi {{ $name }}, we got a request to reset your Beam password. Tap the button below to choose a new one. This link expires in 60 minutes.</p>
        </td></tr>
        <tr><td style="padding:24px 28px 8px;">
          <a href="{{ $link }}" style="display:inline-block;background:#C6FF3D;color:#0E0F12;font-size:15px;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:999px;">Reset password</a>
        </td></tr>
        <tr><td style="padding:16px 28px 32px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#9AA1AC;">Didn’t ask for this? You can safely ignore this email — your password won’t change.</p>
        </td></tr>
      </table>
      <p style="margin:18px 0 0;font-size:12px;color:#9AA1AC;">Beam — send big, then it’s gone.</p>
    </td></tr>
  </table>
</body></html>
