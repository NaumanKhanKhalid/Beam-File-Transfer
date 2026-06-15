# Beam API (Laravel)

A clean REST API for the Beam file-transfer app — auth, transfers, subscriptions, branding, and admin subscription management. Token auth via **Laravel Sanctum**. Designed to be consumed by the vanilla-JS frontend today and a React app later (same endpoints, same `api.js` client).

> **These files are a drop-in for a fresh Laravel 11 app.** They are not a full Laravel install (no `vendor/`, `artisan`, framework scaffolding). Create a Laravel project, then copy these files over the matching paths.

---

## 1. Setup

```bash
# 1. Fresh Laravel app
composer create-project laravel/laravel beam-api
cd beam-api

# 2. Auth scaffolding
composer require laravel/sanctum
php artisan install:api          # publishes Sanctum + creates personal_access_tokens table

# 3. Copy the files from THIS backend/ folder over the matching paths:
#    app/Models/*            app/Http/Controllers/Api/*   app/Http/Requests/*
#    app/Http/Resources/*    app/Http/Middleware/*        routes/api.php
#    config/plans.php        database/migrations/*        database/seeders/BeamSeeder.php
#    bootstrap/app.php  (merge the ->withMiddleware alias)

# 4. Local file storage for uploads + brand logos
php artisan storage:link

# 5. Database (sqlite is easiest for local)
touch database/database.sqlite          # then set DB_CONNECTION=sqlite in .env
php artisan migrate
php artisan db:seed --class=BeamSeeder

# 6. Run
php artisan serve                        # http://127.0.0.1:8000
```

Call `DatabaseSeeder` → `$this->call(BeamSeeder::class);` if you prefer `php artisan migrate --seed`.

### .env essentials
```
APP_URL=http://127.0.0.1:8000
DB_CONNECTION=sqlite
FILESYSTEM_DISK=local

# Allow the frontend origin (CORS). For the static HTML during dev:
SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:8000
```
Set `config/cors.php` `paths` to include `api/*` and `allowed_origins` to your frontend URL.

**Seeded admin:** `admin@beam.to` / `password`. Other seeded users share the password `password`.

---

## 2. Auth model

Stateless **bearer tokens**. Register/login return `{ token, user }`. Send the token on every protected request:

```
Authorization: Bearer 3|xxxxxxialong...token
Accept: application/json
```

---

## 3. Endpoint reference

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/register` | — | Create account → `{token,user}` |
| POST | `/api/login` | — | Log in → `{token,user}` |
| GET | `/api/me` | token | Current user (+ subscription) |
| POST | `/api/logout` | token | Revoke current token |
| GET | `/api/plans` | — | Plan catalogue + pricing |
| POST | `/api/transfers` | optional | Create transfer (multipart: `files[]`, `title`, `message`, `recipients[]`, `expiry`, `password`, `burn`, `notify`, `branded`) |
| GET | `/api/transfers` | token | List my sent transfers (paginated) |
| DELETE | `/api/transfers/{id}` | token | Delete a transfer + its files |
| GET | `/api/t/{slug}` | — | Public recipient view (files hidden if protected) |
| POST | `/api/t/{slug}/unlock` | — | Verify access code → returns files |
| GET | `/api/t/{slug}/files/{file}` | — | Download one file (counts + burns) |
| PATCH | `/api/profile` | token | Update name / email |
| PUT | `/api/profile/branding` | token (Pro) | Brand name / accent / logo upload |
| GET | `/api/subscription` | token | Current subscription |
| POST | `/api/subscription/checkout` | token | Activate Pro/Business (`plan`,`billing_cycle`,`payment_token`) |
| DELETE | `/api/subscription` | token | Cancel → back to Free |
| GET | `/api/admin/subscribers` | admin | Stats + subscriber list |
| POST | `/api/admin/subscribers` | admin | Create user + assign plan |
| PATCH | `/api/admin/subscribers/{user}` | admin | Change plan / status |
| DELETE | `/api/admin/subscribers/{user}` | admin | Remove subscriber |

---

## 4. Payment note (production)

Never accept raw card numbers. The frontend tokenises the card with your PSP (**Razorpay/Stripe**) and posts only the `payment_token`. In `SubscriptionController::checkout()` verify/capture that token with the PSP **before** creating the `subscriptions` row. Use the PSP's webhooks to keep `status` in sync (`past_due`, `canceled`, renewals).

## 5. Production hardening (not in this demo)

- Queue file cleanup for burned/expired transfers (`schedule` + a `PruneTransfers` job).
- Store uploads on S3 (`FILESYSTEM_DISK=s3`) and stream via signed URLs.
- Rate-limit `/login`, `/register`, and `/t/{slug}/unlock` (`throttle` middleware).
- Add a `TransferPolicy` if ownership logic grows beyond the inline checks.
