# Beam — Blade front-end

Server-rendered **Blade** for layout/chrome + the existing **JSON API** (`routes/api.php`)
for all dynamic data and actions, via `beam-api.js` — the *same* client the React
front-end will use later. Blade renders the static HTML; JavaScript hydrates the
auth-dependent and interactive regions.

## Run

```bash
php artisan serve            # serves the Blade UI at http://127.0.0.1:8000
```

Assets are plain files under `public/assets/` (Tailwind via CDN for now) — no npm build
needed. The API base is read from `<meta name="api-base">` (defaults to `/api`); override
with `config(['app.api_base' => 'http://127.0.0.1:8000/api'])` if the API runs elsewhere.

## Structure

```
resources/views/
  layouts/
    app.blade.php          master shell: sidebar + topbar + @yield('content') + scripts
    guest.blade.php        centered shell (auth / recipient)
  partials/
    head.blade.php         meta, fonts, tailwind config, app.css
    scripts.blade.php      shared module (beam.js)
  components/
    icon.blade.php         <x-icon name="upload" class="w-5 h-5"/>  (server-rendered SVG)
    sidebar.blade.php      <x-sidebar :active="..."/>
    topbar.blade.php       <x-topbar :title="..."/>
    toggle.blade.php       <x-toggle id="pw" :on="false"/>
    toasts.blade.php
    view-switch.blade.php
  pages/
    send.blade.php         ✅ fully built reference screen
    placeholder.blade.php   stand-ins for screens still to port
    guest-placeholder.blade.php

public/assets/
  css/app.css              custom styles + dark mode
  js/tailwind.config.js    theme tokens
  js/beam-api.js           framework-agnostic API client (shared with React)
  js/beam.js               shared: api config, toast, helpers, icons, theme, auth hydration
  js/page-send.js          Send-screen interactivity (dropzone, list, toggles, send→API)
```

## How a page works

1. A route renders a Blade view: `Route::view('/', 'pages.send', ['active'=>'send','view'=>'sender'])`.
2. The layout server-renders the shell + screen markup (real HTML, no JS needed to see it).
3. `beam.js` (loaded everywhere) configures the API, wires the theme toggle, and — if a
   Sanctum token is present — calls `api.auth.me()` to hydrate the sidebar account card,
   topbar actions and storage meter.
4. Page modules (e.g. `page-send.js`) wire interactivity and call the API
   (`api.transfers.create(...)`).

## Routes / pages

| Route | View | Page JS | API used |
|-------|------|---------|----------|
| `/`            | `pages/send`      | `page-send.js`      | `transfers.create` |
| `/transfers`   | `pages/transfers` | `page-transfers.js` | `transfers.list` |
| `/settings`    | `pages/settings`  | `page-settings.js`  | `auth.me`, `profile.update`, `profile.branding`, `subscription.cancel` |
| `/upgrade`     | `pages/upgrade`   | `page-upgrade.js`   | `subscription.checkout` |
| `/admin`       | `pages/admin`     | `page-admin.js`     | `admin.*` |
| `/login`       | `pages/auth`      | `page-auth.js`      | `auth.login` / `auth.register` |
| `/recipient`, `/r/{slug}` | `pages/recipient` | `page-recipient.js` | `transfers.get` / `transfers.unlock` |

Data-heavy pages render demo/seed content server-side so they look complete without
a backend, then hydrate from the API when a Sanctum token is present.

## Storage quota / usage tracking

`GET /api/usage` (public) returns `{ scope, plan, used, cap, remaining, exceeded }`:
- **Signed-in users** are metered by `user_id` against their plan's `max_bytes`.
- **Guests** are metered by **sender IP** against the Free 2 GB cap — so the allowance
  survives refresh, new tabs and incognito, and can't be reset by clearing cookies.

`beam.js` paints the sidebar meter from this on load; `page-send.js` adds the staged
bytes on top. `TransferController@store` enforces the SAME quota server-side
(`App\Support\Quota`) and returns 422 `guest_quota_exceeded` / `quota_exceeded` once the
limit is hit — the UI then pushes guests to register and paid users to upgrade.
**Run `php artisan migrate`** to add the `sender_ip` column this needs.

## Realtime download updates (WebSockets, optional)

The Transfers dashboard updates download counts live. Two layers:
- **Polling** (always on): refreshes every 8s while the tab is visible, and
  instantly on tab focus. Works with zero setup.
- **WebSockets** (instant, opt-in): Laravel **Reverb** broadcasts a
  `TransferDownloaded` event the moment a file is downloaded; the dashboard
  updates that card in place (with a green count pulse). `realtime.js` uses
  `pusher-js` from CDN — no build step — and **safely no-ops if Reverb is off**,
  so polling stays as the fallback.

Enable Reverb:
```bash
composer require laravel/reverb
php artisan reverb:install        # sets BROADCAST_CONNECTION + REVERB_* in .env
php artisan reverb:start          # run alongside `php artisan serve`
```
The channel is public (`transfer.{slug}`) so guests and signed-in senders both
get updates with no channel auth. Nothing else to wire — `partials/scripts`
injects the client config automatically when `BROADCAST_CONNECTION=reverb`.

## Status

- ✅ All reachable screens ported: Send, Transfers, Settings, Upgrade, Admin, Auth, Recipient.
- ⛔ Rooms & Requests are not in this app's nav (no API endpoints) — skipped; ask to add.

## Email notifications, password reset & verification

- **Download notify** — when a recipient downloads and the sender left **"Notify on
  download"** on, `TransferController@download` emails the sender
  (`App\Mail\TransferDownloadedMail`). Signed-in senders only; best-effort (a mail
  failure never breaks the download).
- **Forgot / reset password** — `POST /api/password/forgot` emails a signed reset link
  (`PasswordResetMail`); `/reset-password?token=&email=` page posts to
  `POST /api/password/reset`. Tokens are hashed in `password_reset_tokens`, expire in 60 min.
- **Email verification** — register fires `VerifyEmailMail` with a 24 h signed link
  (`GET /api/email/verify/{id}/{hash}`). A dismissible banner nudges unverified users;
  `POST /api/email/resend` re-sends. `UserResource.verified` exposes the state.

All mail works out of the box with `MAIL_MAILER=log` (writes to `storage/logs/laravel.log`).
For real delivery (Gmail SMTP, etc.) copy the ready-made block from **`backend/.env.mail.example`**
into your `.env`, fill in the two secrets, then `php artisan config:clear`. Verify it with
**`php artisan beam:mail-test you@example.com`** before relying on it. Ideally run a queue
(`QUEUE_CONNECTION=database` + `php artisan queue:work`) so sending doesn't block requests.

## Recipient experience

- **Download all as ZIP** — real transfers stream one `GET /api/t/{slug}/zip` (folder
  paths preserved); demo transfers fall back to staggered per-file downloads.
- **Preview lightbox** — images and PDFs open in an overlay before downloading.
- **QR code** — `assets/js/qrcode.js` (self-contained, no external calls) renders a QR
  for the transfer link so recipients can hop to another device.
- **Expiry countdown** — live "expires in …" timer.

## Resumable / chunked uploads

Uploads over 40 MB (or >20 files) switch from a single multipart POST to a **chunked,
resumable** flow (`beam-api.js` `_uploadChunked`): each file streams in 5 MB chunks under
a client `upload_id` to `POST /api/uploads/chunk`; on a dropped connection the client
calls `GET /api/uploads/status` and resumes, with per-chunk retry + backoff.
`POST /api/transfers/commit` assembles the parts into the transfer (same quota / expiry /
password / branding rules as a normal upload). Small uploads keep the simple one-shot POST.

## Account settings

`Settings` page (signed-in only): change password (`PUT /api/profile/password`, verifies
current, signs out other devices) and delete account (`DELETE /api/account`, password
confirm, wipes transfers + files + logo + tokens).

## Scheduled cleanup

`php artisan beam:prune` (also scheduled **hourly** in `routes/console.php`) deletes the
stored files of expired/burned transfers to reclaim disk — the transfer row stays so the
dashboard still shows it as Expired/Burned. Needs the system cron running the Laravel
scheduler: `* * * * * cd /path/to/backend && php artisan schedule:run >> /dev/null 2>&1`.
Run `php artisan beam:prune --dry-run` to preview.

## Admin

`/admin` (Subscribers) and `/admin/plans` (Plans & pricing) are **two pages** sharing a
dark tabbed header (`x-admin-header`). Subscribers: metrics + table, with destructive
actions (Cancel, Remove) behind a **confirm dialog**. Plans: full editor (create / edit
name, prices, storage, expiry, branding / delete) — **DB-backed** via `App\Models\Plan` /
`App\Support\PlanRepo` (seeded from config/plans.php on first use). `/api/plans`, the
upgrade page, `Quota` and expiry clamping all read through PlanRepo. Endpoints:
`GET /api/admin/plans`, `POST /api/admin/plans`, `PUT /api/admin/plans/{key}`,
`DELETE /api/admin/plans/{key}`. **Run `php artisan migrate`** to create the `plans` table.

## Running

```bash
cd backend
php artisan migrate    # required — adds sender_ip (guest usage metering)
php artisan serve      # http://127.0.0.1:8000
```

### Large uploads — fixing HTTP 413

PHP's default upload limits are tiny (`upload_max_filesize = 2M`, `post_max_size = 8M`),
so any real transfer returns **HTTP 413 "Payload Too Large"** before it even reaches
Laravel (the front-end now shows a friendly "files are too large for the server's limit"
message instead of a raw error). Raise the limits — a ready-made `php-dev.ini` is included:

```bash
php -c php-dev.ini artisan serve     # built-in server with 2 GB upload limits
```

For production (nginx + PHP-FPM): set the same `upload_max_filesize` / `post_max_size`
in the real `php.ini`, and add `client_max_body_size 2048M;` to the nginx server block.
The per-file cap is also enforced in `StoreTransferRequest` (`files.* => max:…`) and the
total against the plan quota in `App\Support\Quota`.

Open via `http://` (not https) — the dev server is plaintext. `localhost` avoids Chrome's
HTTPS auto-upgrade. The static `public/preview-*.html` dev mirrors have been removed; the
original vanilla single-page app stays in `../html-app/` as the visual reference.
