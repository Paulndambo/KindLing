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

Configure one scheduler to run this command every 5 minutes in the same release/environment:

```sh
python manage.py run_scheduled_jobs
```

The internal job intervals determine which jobs are due. Verify `GET /api/jobs/status/` and run `python manage.py run_job heartbeat` once after first deploy. Avoid running overlapping scheduler instances.

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

Point a temporary deployment at the restored database, run `python manage.py migrate --check`, and verify `GET /health/ready/`. Record the backup timestamp, restore duration, and result. Never test restore over production. Back up uploaded media separately.

## Pre-launch items still requiring external setup

- Provision host, DNS/TLS, managed PostgreSQL, and durable media storage.
- Set host secrets and validate migration/seed behavior on an empty staging database.
- Configure actual SMTP/ESP and confirm a test delivery.
- Configure scheduler and verify a successful job.
- Choose payment/invoice flow, AI key custody/quotas, invite restriction, support contact, and legal links. These are Track D/BETA P0 work but are not implemented by the container foundation.
- Run and record an actual database/media backup restore drill.
