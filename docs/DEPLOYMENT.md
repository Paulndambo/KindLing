# Production deployment foundation

The API runs as a container from `backend/Dockerfile`. Use any container host that provides managed PostgreSQL, HTTPS termination, persistent or object storage for uploaded homework, and scheduled commands. The repository does not provision cloud resources or configure a provider account. For a single self-managed Docker host, `docker-compose.production.yml` provides the API and Caddy reverse proxy; Caddy obtains and renews HTTPS certificates when the API domain resolves to that host and ports 80/443 are reachable. Managed application platforms can use the API image directly and provide their own HTTPS proxy.

The `Backend PostgreSQL migrations` GitHub Actions workflow validates model migration state, applies migrations to an empty PostgreSQL 16 database, checks that no migrations remain unapplied, and runs `seed_kindling` against that empty database. Keep the host's release command pointed at `python manage.py migrate --noinput`; CI does not replace validation against the actual staging/prod database.

## Required API environment

Set these values in the host's secret/environment manager; do not commit real values:

- `APP_ENV=production` and `DEBUG=false`
- `SECRET_KEY`: unique, long random Django secret
- `DATABASE_URL`: PostgreSQL URL (`postgresql://...`); use a provider URL with TLS support
- `ALLOWED_HOSTS`: comma-separated API hostnames, no scheme
- `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`: comma-separated full frontend origins including `https://`
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `DEFAULT_FROM_EMAIL`
- `PLATFORM_GEMINI_API_KEY`: optional server-side Gemini key for platform AI plans; never set this as a `VITE_*` frontend variable
- `ALLOW_SELF_SERVICE_PLAN_ACTIVATION=false`: keep paid plan activation behind invoice payment confirmation in production
- `SUPPORT_EMAIL`: monitored staff inbox for support-request notifications (set before inviting students)

Django refuses non-debug startup if the secret, database URL, allowed hosts, or SMTP host is missing. SQLite and console email remain development defaults only. Production HTTPS redirect, secure cookies, proxy HTTPS detection, and HSTS are enabled in non-debug mode. Set `SECURE_SSL_REDIRECT=false` only when TLS is terminated elsewhere and the app cannot receive the forwarded protocol header.

Frontend hosting needs a build-time `VITE_API_URL=https://api.example.com`. `VITE_API_URL` is public config; never put platform provider secrets in a `VITE_*` variable. Platform Gemini requests require an authenticated user with an eligible platform AI entitlement; the API proxy limits requests to 30 per user per hour and caps generated output at 2048 tokens. Django's default local-memory throttle is per process; configure a shared cache backend for reliable cross-worker production throttling.

For the self-managed Compose option, copy `backend/.env.production.example` to `backend/.env.production`, set the production values there, then start Compose with the public API hostname available as `API_DOMAIN`:

```sh
API_DOMAIN=api.example.com docker compose -f docker-compose.production.yml up -d --build
```

On PowerShell, set `$env:API_DOMAIN="api.example.com"` before running Compose. Point the hostname's DNS A/AAAA records at the host and allow inbound TCP 80/443 and UDP 443. The API container is only exposed on the private Compose network; Caddy is the only service publishing web ports. Configure `ALLOWED_HOSTS` to the API hostname and CORS/CSRF origins to the exact HTTPS frontend origin(s). Verify `https://<API_DOMAIN>/health/` and the frontend's HTTPS API connection after deploy.

## Build and launch

From the repository root:

```sh
docker build -t kindling-api ./backend
docker run --rm -p 8000:8000 --env-file backend/.env.production kindling-api
```

The image includes a liveness health check against `/health/live/`. For direct container use, configure the hosting platform's health probe to the same path and expose HTTPS at its edge proxy.

The image collects static assets at build time. Configure a one-off release/pre-deploy command `python manage.py migrate --noinput` before routing traffic to the new release; do not put migrations in each web worker startup because concurrent replicas can race. Use a managed Postgres database and set the host's web process port (default `8000`). Do not run `seed_kindling` against a live student database: it creates demo content/accounts. For an empty staging database, run it once as an explicit one-off after deployment if demo fixtures are wanted.

Probe `GET /health/live/`, `GET /health/ready/`, then `GET /health/`. Readiness checks the database. Use the platform's HTTPS endpoint for the external check.

## Scheduled jobs

The self-managed Compose deployment includes one scheduler container. It starts after the API health check, runs the due-job command immediately, then waits five minutes between checks. It shares the API environment and media volume so scheduled reports and retention jobs see the expected storage. Keep exactly one scheduler instance; do not also configure an external cron for the same deployment.

Start and inspect it with:

```sh
docker compose -f docker-compose.production.yml up -d --build scheduler
docker compose -f docker-compose.production.yml logs -f scheduler
```

Set `KINDLING_SCHEDULER_INTERVAL_SECONDS` in `backend/.env.production` to change the check cadence (default 300 seconds). The internal job intervals determine which jobs are due. Verify `GET /api/jobs/status/` shows recent successful runs, and run `docker compose -f docker-compose.production.yml exec api python manage.py run_job heartbeat` once after first deploy if you want an immediate manual check. Scheduled runs are live (`dry_run=False`), so opted-in email digests and alerts can be delivered when due. Avoid running overlapping scheduler instances.

For managed application platforms, configure one scheduled task to invoke `python manage.py run_scheduled_jobs` every five minutes using the same release, environment variables, database, and durable media storage as the API.

## Per-student invoice billing (manual beta path)

In account Settings, a signed-in student requests an Ember or Forge invoice for their own seat. The request appears under Django Admin → Billing invoices. Issue the invoice using the team's chosen payment channel, enter the received payment reference, select the invoice, and run **Mark selected invoices paid and activate their student plans**. The action records who confirmed payment and activates only that student's seat for the selected billing period. Do not run the action until funds are confirmed. Paid-plan self-activation is disabled when `DEBUG=false`; `ALLOW_SELF_SERVICE_PLAN_ACTIVATION` is a development/demo-only escape hatch and must stay false in production.

The platform Gemini route reserves one request and a conservative byte-derived token estimate against the student's UTC-day allowance before contacting the provider: Spark allows 30 requests / 60,000 estimated tokens per day and Ember allows 120 requests / 300,000 estimated tokens. It returns HTTP 429 when either limit is exhausted and reports remaining allowance in response headers. This is a safety estimate, not provider-reported token metering or a USD-cost budget; track actual provider spend and tune the allowances before opening a larger cohort. BYOK traffic does not pass through this platform proxy and is billed by the learner's provider.

## Support requests

Learners can submit a short support request from Settings → Help & feedback. The API stores the request in Django Admin → Support requests and sends a notification containing only its reference and category to `SUPPORT_EMAIL` (the message remains in the staff queue). Configure a monitored inbox and confirm it can receive email before launch. Staff should review new and high-priority requests at least once each business day. Mark a request high priority when it blocks account access, billing, or a learner's ability to continue tutoring; routine how-to questions and feedback remain normal priority. The form is not an emergency or crisis channel; urgent safety concerns should go to a trusted adult or local emergency support.

## Uploaded homework files

The default media backend is local filesystem storage. A container's writable layer is not durable. Before accepting student uploads in production, mount a persistent volume at `/app/media` with backups, or implement/configure S3-compatible storage. The 30-day purge policy must be scheduled and verified for the chosen storage. Do not treat database backups as covering media files.

## Database backup and restore runbook

Use provider-managed automated backups/PITR where available. If taking logical backups, run from an environment with `pg_dump`/`pg_restore` and database network access:

```sh
pg_dump --format=custom --no-owner "$DATABASE_URL" --file kindling-$(date -u +%Y%m%dT%H%M%SZ).dump
```

Restore drill (use a separate empty temporary database; this overwrites that target):

```sh
createdb kindling_restore_drill
pg_restore --clean --if-exists --no-owner --dbname kindling_restore_drill kindling-backup.dump
```

Point an isolated temporary deployment at the restored database, run `python manage.py migrate --check`, and verify `GET /health/ready/`. Restore media separately and confirm a non-sensitive sample file is readable. Disable outbound email, billing, and AI provider calls for the drill. Record the backup timestamp, restore duration, and result using [the restore drill record](./BACKUP_RESTORE_DRILL_RECORD.md); store backup identifiers and evidence in access-controlled operations storage, never secrets or student data in Git. Never test restore over production. Back up uploaded media separately.

## Pre-launch items still requiring external setup

- Provision host, DNS/TLS, managed PostgreSQL, and durable media storage.
- Set host secrets and validate migration/seed behavior on an empty staging database.
- Configure actual SMTP/ESP and confirm a test delivery.
- From the backend environment, run `python manage.py send_test_email you@example.com`; this sends one explicit test message and confirms the backend accepted it. Confirm inbox delivery (including spam folder) before treating email as production-ready.
- For SMTP, set `EMAIL_USE_TLS=true` with `EMAIL_USE_SSL=false` for STARTTLS, or `EMAIL_USE_TLS=false` with `EMAIL_USE_SSL=true` for implicit TLS. `EMAIL_TIMEOUT` defaults to 10 seconds.
- Configure scheduler and verify a successful job.
- Set `SUPPORT_EMAIL`, verify delivery to the monitored support inbox, and assign daily queue ownership.
- Review and approve the in-app Terms and Privacy beta drafts with counsel; confirm service-specific data handling before external enrollment.
- Run and sign off an actual isolated database and media backup restore drill using the linked record template.
