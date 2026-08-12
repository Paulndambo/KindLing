"""
HTTP request observability middleware.

Logs method, path, status, and latency for every API request. Bodies are never
logged (PII risk). 4xx → WARNING, 5xx → ERROR.
"""

from __future__ import annotations

import logging
import time
import uuid
from typing import Callable

from django.http import HttpRequest, HttpResponse

from .logging_utils import log_event

# Paths that are high-churn and usually uninteresting (still logged at DEBUG)
_QUIET_PREFIXES = (
    "/static/",
    "/favicon",
)


class RequestLoggingMiddleware:
    """Attach a request id and emit structured access logs."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:16]
        request.kindling_request_id = request_id  # type: ignore[attr-defined]

        start = time.perf_counter()
        response: HttpResponse | None = None
        try:
            response = self.get_response(request)
            return response
        finally:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            status = getattr(response, "status_code", 500) if response else 500

            if response is not None:
                response["X-Request-ID"] = request_id

            path = request.path or "/"
            if any(path.startswith(p) for p in _QUIET_PREFIXES):
                level = logging.DEBUG
            elif status >= 500:
                level = logging.ERROR
            elif status >= 400:
                level = logging.WARNING
            else:
                level = logging.INFO

            user = getattr(request, "user", None)
            user_id = None
            if user is not None and getattr(user, "is_authenticated", False):
                user_id = getattr(user, "pk", None)

            log_event(
                "http.request",
                level=level,
                request_id=request_id,
                method=request.method,
                path=path,
                status=status,
                duration_ms=duration_ms,
                user_id=user_id,
            )
