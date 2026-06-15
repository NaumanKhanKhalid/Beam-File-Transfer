# Fixing CORS — step by step

CORS errors look like this in the browser console:

> Access to fetch at 'http://127.0.0.1:8000/api/login' from origin 'http://localhost:5500'
> has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present…

It means the **browser** blocked the call because the API didn't say "this origin is allowed". Fix it on the **Laravel side** (the server decides), in 4 steps.

---

## 1. Serve the HTML over http — NOT file://

This is the #1 cause. If you open `Beam App.html` by double-clicking, the address bar shows `file:///…`. A `file://` page has Origin **`null`**, which CORS can't allow.

**Serve it instead** (pick one):

```bash
# Option A — PHP's built-in server, from the html-app/ folder
cd html-app
php -S localhost:5500

# Option B — VS Code: install "Live Server" extension → right-click the HTML → "Open with Live Server"

# Option C — any static server
npx serve html-app -l 5500
```

Now open `http://localhost:5500/Beam%20App%20(HTML%20+%20Tailwind).html`.

> ⚠️ Note the module import: `beam-api.js` is loaded with `<script type="module">`, which also **requires http** (modules don't load over file://). So serving over http fixes two things at once.

---

## 2. Add the cors.php config

Copy `backend/config/cors.php` into your Laravel app at `config/cors.php`, then make sure **`allowed_origins`** lists the EXACT origin your page is served from (scheme + host + port):

```php
'paths' => ['api/*', 't/*'],
'allowed_origins' => [
    'http://localhost:5500',   // ← must match the page's address bar exactly
],
'supports_credentials' => false,   // Beam uses Bearer tokens, not cookies
```

`http://localhost:5500` ≠ `http://127.0.0.1:5500` ≠ `http://localhost:5501`. Add whichever you actually use.

---

## 3. Point the frontend at the API

In `Beam App (HTML + Tailwind).html`, inside the `<script type="module">` live-mode block:

```js
const API_BASE = 'http://127.0.0.1:8000/api';   // your `php artisan serve` URL
```

---

## 4. Clear config cache & restart

Laravel caches config. After editing `config/cors.php` or `.env`:

```bash
php artisan config:clear
php artisan serve
```

---

## Still blocked? Checklist

- [ ] Page is on **http://**, not file:// (check the address bar)
- [ ] The origin in the address bar is **letter-for-letter** in `allowed_origins`
- [ ] `php artisan config:clear` after any change
- [ ] Laravel is actually running (`php artisan serve` → 127.0.0.1:8000)
- [ ] The **preflight** `OPTIONS` request returns 204 — check the Network tab
- [ ] You did **not** set `supports_credentials => true` while also using `'*'` origins (browsers forbid that combo)
- [ ] Hard refresh the page (Cmd/Ctrl+Shift+R) so the browser drops cached preflights

## Quick way to prove it's CORS (and not the API)

Run this — it bypasses the browser, so if it works, your API is fine and the issue is purely CORS/origin:

```bash
curl -i -X POST http://127.0.0.1:8000/api/login \
  -H "Accept: application/json" -H "Content-Type: application/json" \
  -d '{"email":"admin@beam.to","password":"password"}'
```

A `200` with a token means the API is good — focus on steps 1–2.
