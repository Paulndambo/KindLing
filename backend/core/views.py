"""
Health probes and telemetry ingest for Kindling observability (Phase 0.2).
"""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from django.db import connection
from django.db.models import Avg, Count
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from learning.models import LearningEvent, LearningEventType

from .logging_utils import log_event, sanitize_extra, sanitize_text
from .models import ClientErrorReport, ProductMetric, SafetyEvent
from .safety import policy_notes_for_grade
from .serializers import (
    ClientErrorBatchSerializer,
    ClientErrorReportSerializer,
    ProductMetricBatchSerializer,
    ProductMetricSerializer,
    SafetyEventSerializer,
)


def _db_ok() -> bool:
    try:
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return True
    except Exception:
        return False


def _optional_user_id(request: Request) -> int | None:
    user = getattr(request, "user", None)
    if user is not None and getattr(user, "is_authenticated", False):
        return getattr(user, "pk", None)
    return None


def _user_agent(request: Request) -> str:
    return sanitize_text(request.META.get("HTTP_USER_AGENT", ""), max_len=200)


def _request_id(request: Request) -> str:
    return getattr(request, "kindling_request_id", "") or request.headers.get(
        "X-Request-ID", ""
    )


class LivenessView(APIView):
    """GET /health/live/ — process is up (no dependency checks)."""

    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []

    def get(self, request: Request) -> Response:
        return Response(
            {
                "status": "ok",
                "service": "kindling-api",
                "probe": "live",
            }
        )

    def head(self, request: Request) -> Response:
        return self.get(request)


class ReadinessView(APIView):
    """GET /health/ready/ — ready to serve traffic (DB reachable)."""

    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []

    def get(self, request: Request) -> Response:
        db_ok = _db_ok()
        payload = {
            "status": "ok" if db_ok else "unavailable",
            "service": "kindling-api",
            "probe": "ready",
            "checks": {
                "database": "ok" if db_ok else "fail",
            },
        }
        return Response(
            payload,
            status=status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    def head(self, request: Request) -> Response:
        return self.get(request)


class HealthView(APIView):
    """
    GET /health/ and /api/health/ — combined probe (backward compatible).

    Returns 200 when ready, 503 when degraded. Includes both live + ready signals.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []

    def get(self, request: Request) -> Response:
        db_ok = _db_ok()
        payload = {
            "status": "ok" if db_ok else "degraded",
            "service": "kindling-api",
            "probe": "combined",
            "live": "ok",
            "database": "ok" if db_ok else "unavailable",
        }
        # Optional: include last heartbeat age for ops dashboards
        if request.query_params.get("jobs") in ("1", "true", "yes"):
            try:
                from core.jobs.runner import last_successful_run

                hb = last_successful_run("heartbeat")
                payload["jobs"] = {
                    "heartbeat_last_success": (
                        hb.finished_at.isoformat()
                        if hb and hb.finished_at
                        else None
                    ),
                }
            except Exception:
                payload["jobs"] = {"heartbeat_last_success": None}
        return Response(
            payload,
            status=status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    def head(self, request: Request) -> Response:
        return self.get(request)


class ClientErrorIngestView(APIView):
    """
    POST /api/telemetry/errors/

    Accepts a single error object or { "errors": [ ... ] }.
    Auth optional; never requires student content.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request: Request) -> Response:
        raw = request.data
        if isinstance(raw, dict) and "errors" in raw:
            batch = ClientErrorBatchSerializer(data=raw)
            batch.is_valid(raise_exception=True)
            items = batch.validated_data["errors"]
        else:
            single = ClientErrorReportSerializer(data=raw)
            single.is_valid(raise_exception=True)
            items = [single.validated_data]

        user_id = _optional_user_id(request)
        ua = _user_agent(request)
        req_id = _request_id(request)
        created = 0

        for item in items:
            kind = item.get("kind") or ClientErrorReport.Kind.UNKNOWN
            message = sanitize_text(item.get("message") or "", max_len=240)
            code = sanitize_text(item.get("code") or "", max_len=64)
            component = sanitize_text(item.get("component") or "", max_len=80)
            path = sanitize_text(item.get("path") or "", max_len=200)
            session_id = sanitize_text(item.get("session_id") or "", max_len=64)
            extra = sanitize_extra(item.get("extra") or {})

            report = ClientErrorReport.objects.create(
                kind=kind,
                message=message,
                code=code,
                component=component,
                path=path,
                session_id=session_id,
                client_ts=item.get("client_ts"),
                user_agent=ua,
                user_id=user_id,
                extra=extra,
                request_id=req_id,
            )
            created += 1

            log_event(
                "client.error",
                level=logging.WARNING,
                request_id=req_id,
                kind=kind,
                code=code,
                component=component,
                path=path,
                session_id=session_id or None,
                user_id=user_id,
                message=message,
                report_id=report.pk,
            )

        return Response(
            {"ok": True, "accepted": created},
            status=status.HTTP_202_ACCEPTED,
        )


class ProductMetricIngestView(APIView):
    """
    POST /api/telemetry/metrics/

    Accepts a single metric or { "metrics": [ ... ] }.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request: Request) -> Response:
        raw = request.data
        if isinstance(raw, dict) and "metrics" in raw:
            batch = ProductMetricBatchSerializer(data=raw)
            batch.is_valid(raise_exception=True)
            items = batch.validated_data["metrics"]
        else:
            single = ProductMetricSerializer(data=raw)
            single.is_valid(raise_exception=True)
            items = [single.validated_data]

        user_id = _optional_user_id(request)
        created = 0

        for item in items:
            name = item["name"]
            value = float(item.get("value", 1.0))
            session_id = sanitize_text(item.get("session_id") or "", max_len=64)
            tags = sanitize_extra(item.get("tags") or {})

            ProductMetric.objects.create(
                name=name,
                value=value,
                session_id=session_id,
                client_ts=item.get("client_ts"),
                user_id=user_id,
                tags=tags,
            )
            created += 1

            log_event(
                "product.metric",
                level=logging.INFO,
                name=name,
                value=value,
                session_id=session_id or None,
                user_id=user_id,
                tags=tags or None,
            )

        return Response(
            {"ok": True, "accepted": created},
            status=status.HTTP_202_ACCEPTED,
        )


class ObservabilitySummaryView(APIView):
    """
    GET /api/telemetry/summary/?hours=24

    Answers: "Is tutoring healthy today?" from stored telemetry + learning events.
    No PII in the payload.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []

    def get(self, request: Request) -> Response:
        try:
            hours = int(request.query_params.get("hours", 24))
        except (TypeError, ValueError):
            hours = 24
        hours = max(1, min(hours, 168))  # 1h .. 7d

        since = timezone.now() - timedelta(hours=hours)
        db_ok = _db_ok()

        error_qs = ClientErrorReport.objects.filter(created_at__gte=since)
        error_total = error_qs.count()
        by_kind = {
            row["kind"]: row["c"]
            for row in error_qs.values("kind").annotate(c=Count("id"))
        }

        metric_qs = ProductMetric.objects.filter(created_at__gte=since)
        metric_counts = {
            row["name"]: row["c"]
            for row in metric_qs.values("name").annotate(c=Count("id"))
        }

        sessions_started = metric_counts.get("session.started", 0)
        first_messages = metric_counts.get("session.first_message", 0)
        drop_offs = metric_counts.get("session.drop_off", 0)

        first_msg_latency = metric_qs.filter(name="session.first_message").aggregate(
            avg=Avg("value")
        )["avg"]

        # Intervention funnel from learning events (already product of truth)
        event_qs = LearningEvent.objects.filter(timestamp__gte=since)
        intervention_counts = {
            row["event_type"]: row["c"]
            for row in event_qs.filter(
                event_type__in=[
                    LearningEventType.INTERVENTION_OFFERED,
                    LearningEventType.INTERVENTION_ENTERED,
                    LearningEventType.INTERVENTION_DECLINED,
                    LearningEventType.INTERVENTION_EXITED,
                    LearningEventType.SESSION_START,
                    LearningEventType.SESSION_END,
                ]
            )
            .values("event_type")
            .annotate(c=Count("id"))
        }

        offered = intervention_counts.get(LearningEventType.INTERVENTION_OFFERED, 0)
        entered = intervention_counts.get(LearningEventType.INTERVENTION_ENTERED, 0)
        declined = intervention_counts.get(LearningEventType.INTERVENTION_DECLINED, 0)
        exited = intervention_counts.get(LearningEventType.INTERVENTION_EXITED, 0)
        learning_session_starts = intervention_counts.get(
            LearningEventType.SESSION_START, 0
        )
        learning_session_ends = intervention_counts.get(
            LearningEventType.SESSION_END, 0
        )

        def _rate(num: int, den: int) -> float | None:
            if den <= 0:
                return None
            return round(num / den, 3)

        # Rough health signal for operators
        gemini_errors = by_kind.get(ClientErrorReport.Kind.GEMINI, 0)
        tts_errors = by_kind.get(ClientErrorReport.Kind.TTS, 0)
        api_errors = by_kind.get(ClientErrorReport.Kind.API, 0)

        if not db_ok:
            tutoring_health = "degraded"
        elif gemini_errors >= 20 or error_total >= 50:
            tutoring_health = "degraded"
        elif gemini_errors >= 5 or tts_errors >= 10 or api_errors >= 10:
            tutoring_health = "watch"
        else:
            tutoring_health = "ok"

        payload: dict[str, Any] = {
            "window_hours": hours,
            "since": since.isoformat(),
            "generated_at": timezone.now().isoformat(),
            "tutoring_health": tutoring_health,
            "service": {
                "live": "ok",
                "database": "ok" if db_ok else "unavailable",
            },
            "client_errors": {
                "total": error_total,
                "by_kind": by_kind,
            },
            "funnel": {
                "sessions_started": sessions_started,
                "sessions_with_first_message": first_messages,
                "first_message_rate": _rate(first_messages, sessions_started),
                "drop_offs_no_message": drop_offs,
                "avg_ms_to_first_message": (
                    round(first_msg_latency, 1) if first_msg_latency is not None else None
                ),
            },
            "interventions": {
                "offered": offered,
                "entered": entered,
                "declined": declined,
                "exited": exited,
                "accept_rate": _rate(entered, offered) if offered else _rate(entered, entered),
                "decline_rate": _rate(declined, offered),
            },
            "learning_sessions": {
                "starts": learning_session_starts,
                "ends": learning_session_ends,
            },
            "metrics_raw_counts": metric_counts,
            "notes": [
                "HTTP latency and 4xx/5xx appear in structured logs as event=http.request",
                "Client errors and product metrics are scrubbed of PII at ingest",
            ],
        }
        return Response(payload)


class SafetyEventIngestView(APIView):
    """
    POST /api/safety/events/

    Scrubbed distress / safety escalations from the SPA.
    Never expects the raw student message body.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request: Request) -> Response:
        serializer = SafetyEventSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user_id = _optional_user_id(request)
        category = sanitize_text(data.get("category") or "unknown", max_len=40).lower()
        code = sanitize_text(data.get("code") or "", max_len=64)
        severity = data.get("severity") or SafetyEvent.Severity.HIGH
        if severity not in (
            SafetyEvent.Severity.LOW,
            SafetyEvent.Severity.HIGH,
            SafetyEvent.Severity.INFO,
        ):
            severity = SafetyEvent.Severity.HIGH

        event = SafetyEvent.objects.create(
            category=category or "unknown",
            code=code,
            severity=severity,
            age_band=sanitize_text(data.get("age_band") or "", max_len=20),
            session_id=sanitize_text(data.get("session_id") or "", max_len=64),
            component=sanitize_text(data.get("component") or "lesson", max_len=80),
            user_id=user_id,
            client_ts=data.get("client_ts"),
            extra=sanitize_extra(data.get("extra") or {}),
        )

        log_event(
            "safety.escalation",
            level=logging.WARNING,
            category=event.category,
            code=event.code,
            severity=event.severity,
            age_band=event.age_band or None,
            session_id=event.session_id or None,
            user_id=user_id,
            event_id=event.pk,
        )

        return Response(
            {"ok": True, "accepted": 1, "id": event.pk},
            status=status.HTTP_202_ACCEPTED,
        )


class SafetyPolicyView(APIView):
    """
    GET /api/safety/policy/?grade=5th%20Grade

    Server-side policy notes for a grade label (age band + rule ids).
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []

    def get(self, request: Request) -> Response:
        grade = request.query_params.get("grade") or ""
        notes = policy_notes_for_grade(grade)
        return Response(
            {
                "service": "kindling-api",
                "policy_version": 1,
                **notes,
            }
        )


class JobsStatusView(APIView):
    """
    GET /api/jobs/status/

    Snapshot of registered jobs and last run outcomes (ops / staging checks).
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes: list = []

    def get(self, request: Request) -> Response:
        from core.jobs.runner import jobs_status_snapshot

        snapshot = jobs_status_snapshot()
        return Response(
            {
                "service": "kindling-api",
                "runner": "management-command",
                **snapshot,
            }
        )
