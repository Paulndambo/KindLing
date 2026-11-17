"""
Django settings for Kindling backend API.
"""

from datetime import timedelta
import os
from pathlib import Path
from typing import List, Dict, Any

import dj_database_url

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

def env_bool(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    return default if value is None else value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: List[str] | None = None) -> List[str]:
    value = os.environ.get(name)
    if value is None:
        return default or []
    return [item.strip() for item in value.split(",") if item.strip()]


def read_local_env_values() -> Dict[str, str]:
    """Parse key-value pairs from backend/.env if present."""
    env_path = BASE_DIR / ".env"
    if not env_path.is_file():
        return {}
    parsed: Dict[str, str] = {}
    for line in env_path.read_text(encoding="utf-8").splitlines():
        entry = line.strip()
        if not entry or entry.startswith("#"):
            continue
        if entry.startswith("export "):
            entry = entry[7:].lstrip()
        name, separator, value = entry.partition("=")
        if not separator or not name.strip():
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        parsed[name.strip()] = value
    return parsed


def load_local_env() -> None:
    """Load backend/.env for local development without overriding non-empty host config."""
    for key, value in read_local_env_values().items():
        if not os.environ.get(key, "").strip():
            os.environ[key] = value


load_local_env()

APP_ENV = os.environ.get("APP_ENV", "development").strip().lower()
DEBUG: bool = env_bool("DEBUG", APP_ENV != "production")
SECRET_KEY: str = os.environ.get("SECRET_KEY", "").strip()
if not SECRET_KEY:
    if not DEBUG:
        raise RuntimeError("SECRET_KEY must be set when DEBUG is disabled.")
    SECRET_KEY = "django-insecure-local-development-only"
PLATFORM_GEMINI_API_KEY: str = os.environ.get("PLATFORM_GEMINI_API_KEY", "").strip()
SUPPORT_EMAIL: str = os.environ.get("SUPPORT_EMAIL", "").strip()
ALLOWED_HOSTS: List[str] = ["https://logical-useful-shad.ngrok-free.app", "logical-useful-shad.ngrok-free.app", "127.0.0.1", "localhost"]
ALLOW_SELF_SERVICE_PLAN_ACTIVATION = env_bool(
    "ALLOW_SELF_SERVICE_PLAN_ACTIVATION", DEBUG
)
# ngrok assigns a new hostname when a temporary tunnel is restarted. Allow the
# current development tunnel by default, and let developers override it without
# broadening the accepted hosts to every ngrok subdomain.
NGROK_HOST = os.environ.get("NGROK_HOST", "logical-useful-shad.ngrok-free.app").strip()
if DEBUG and NGROK_HOST and NGROK_HOST not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(NGROK_HOST)
if not DEBUG and not ALLOWED_HOSTS:
    raise RuntimeError("ALLOWED_HOSTS must be set when DEBUG is disabled.")


# Application definition
INSTALLED_APPS: List[str] = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    
    # Third-party
    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",
    "django_filters",

    # Kindling apps
    "core",
    "accounts",
    "students",
    "curriculum",
    "learning",
    "kindling_platform",
]

MIDDLEWARE: List[str] = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # Structured access logs (latency, status, request id) — after auth so user_id is available
    "core.middleware.RequestLoggingMiddleware",
]

ROOT_URLCONF: str = "backend.urls"

TEMPLATES: List[Dict[str, Any]] = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION: str = "backend.wsgi.application"


# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
if DATABASE_URL:
    DATABASES: Dict[str, Dict[str, Any]] = {"default": dj_database_url.parse(
        DATABASE_URL,
        conn_max_age=int(os.environ.get("DB_CONN_MAX_AGE", "60")),
        ssl_require=False,
    )}
else:
    if not DEBUG:
        raise RuntimeError("DATABASE_URL must be set when DEBUG is disabled.")
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}


# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS: List[Dict[str, Any]] = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE: str = "en-us"

TIME_ZONE: str = "UTC"

USE_I18N: bool = True

USE_TZ: bool = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

STATIC_URL: str = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

# User uploads (homework photos — Epic A4). Local filesystem for dev.
MEDIA_URL: str = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
# A 5 MiB homework image expands to about 6.7 MiB when sent as base64 JSON.
DATA_UPLOAD_MAX_MEMORY_SIZE = 8 * 1024 * 1024

# Homework image limits (also enforced in learning.homework)
KINDLING_HOMEWORK_MAX_BYTES: int = 5 * 1024 * 1024
KINDLING_HOMEWORK_RETENTION_DAYS: int = 30

# Allow students to create subjects beyond the original Computer Science pilot.
ALLOW_CUSTOM_SUBJECTS: bool = True

# ---------------------------------------------------------------------------
# Email — parent digests (Epic A5). Console backend for local/dev.
# ---------------------------------------------------------------------------
if os.environ.get("EMAIL_HOST"):
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = os.environ["EMAIL_HOST"]
    EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
    EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
    EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
    EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
    EMAIL_USE_SSL = env_bool("EMAIL_USE_SSL", False)
    EMAIL_TIMEOUT = int(os.environ.get("EMAIL_TIMEOUT", "10"))
    if EMAIL_USE_TLS and EMAIL_USE_SSL:
        raise RuntimeError("EMAIL_USE_TLS and EMAIL_USE_SSL cannot both be enabled.")
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
    if not DEBUG:
        raise RuntimeError("Configure EMAIL_HOST for non-debug deployments.")
DEFAULT_FROM_EMAIL: str = os.environ.get("DEFAULT_FROM_EMAIL", "Kindling <noreply@kindling.local>")

CORS_ALLOWED_ORIGINS: List[str] = env_list("CORS_ALLOWED_ORIGINS", [
    "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:4173", "http://127.0.0.1:4173",
    "http://localhost:3000", "http://127.0.0.1:3000",
    "https://kindus.vercel.app", "https://www.kindus.vercel.app"
])
CSRF_TRUSTED_ORIGINS: List[str] = env_list("CSRF_TRUSTED_ORIGINS")
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
if not DEBUG:
    SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = int(os.environ.get("SECURE_HSTS_SECONDS", "3600"))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", False)

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD: str = "django.db.models.BigAutoField"

# ---------------------------------------------------------------------------
# Django REST Framework + JWT
# ---------------------------------------------------------------------------

REST_FRAMEWORK: Dict[str, Any] = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
        "rest_framework.filters.SearchFilter",
    ),
    # Plain arrays by default — matches frontend local-state shapes.
    # Opt into pagination per-view when lists grow large.
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "platform_ai": "30/hour",
        "anon": "5/hour",
        "user": "5/hour",
    },
}

SIMPLE_JWT: Dict[str, Any] = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=12),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
    "ROTATE_REFRESH_TOKENS": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# ---------------------------------------------------------------------------
# CORS — allow the Vite frontend during development
# ---------------------------------------------------------------------------

CORS_ALLOW_HEADERS: List[str] = [
    "accept",
    "authorization",
    "content-type",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "x-kindling-schema",
    "x-kindling-source",
]

# Learning event ingest may be called without credentials from the SPA
CORS_ALLOW_CREDENTIALS: bool = True

# ---------------------------------------------------------------------------
# Background jobs (Phase 0.5) — cron via: python manage.py run_scheduled_jobs
# ---------------------------------------------------------------------------

# Override per-job schedule / enable flags. See core.jobs.tasks for defaults.
KINDLING_JOBS: Dict[str, Dict[str, Any]] = {
    "heartbeat": {
        "enabled": True,
        "interval_seconds": 3600,  # hourly when scheduler runs
    },
    "weekly_digest": {
        "enabled": True,
        "interval_seconds": 7 * 24 * 3600,
    },
    "mastery_recompute": {
        "enabled": True,
        "interval_seconds": 24 * 3600,
    },
    "review_schedule": {
        "enabled": True,
        "interval_seconds": 24 * 3600,
    },
    # Epic C8.2 — weekly offline eval sample (auto-score + report)
    "weekly_eval_sample": {
        "enabled": True,
        "interval_seconds": 7 * 24 * 3600,
    },
}

# ---------------------------------------------------------------------------
# Logging — structured Kindling observability (Phase 0.2)
# ---------------------------------------------------------------------------

LOGGING: Dict[str, Any] = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{asctime}] {levelname} {name}: {message}",
            "style": "{",
        },
        "simple": {
            "format": "{levelname} {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "loggers": {
        "kindling": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
