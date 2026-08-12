from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from core.logging_utils import sanitize_text
from core.models import ClientErrorReport, ProductMetric
from learning.models import LearningEvent, LearningEventType


class SanitizeTextTests(TestCase):
    def test_scrubs_email_and_truncates(self):
        text = sanitize_text("Contact me at kid@example.com please " + ("x" * 300))
        self.assertNotIn("kid@example.com", text)
        self.assertIn("[email]", text)
        self.assertLessEqual(len(text), 200)


class HealthProbeTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_liveness_ok(self):
        res = self.client.get("/health/live/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["probe"], "live")
        self.assertEqual(res.data["status"], "ok")

    def test_readiness_ok(self):
        res = self.client.get("/health/ready/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["probe"], "ready")
        self.assertEqual(res.data["checks"]["database"], "ok")

    def test_combined_health(self):
        res = self.client.get("/health/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn(res.data["status"], ("ok", "degraded"))
        self.assertIn("X-Request-ID", res)


class TelemetryIngestTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_error_ingest_single(self):
        res = self.client.post(
            "/api/telemetry/errors/",
            {
                "kind": "gemini",
                "message": "Stream failed for student@school.edu",
                "code": "STREAM_ERROR",
                "component": "useChatSession",
                "sessionId": "sess_abc",
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(res.data["accepted"], 1)
        report = ClientErrorReport.objects.get()
        self.assertEqual(report.kind, "gemini")
        self.assertNotIn("student@school.edu", report.message)
        self.assertIn("[email]", report.message)

    def test_error_batch(self):
        res = self.client.post(
            "/api/telemetry/errors/",
            {
                "errors": [
                    {"kind": "tts", "message": "no audio"},
                    {"kind": "api", "message": "timeout", "code": "ETIMEDOUT"},
                ]
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(res.data["accepted"], 2)
        self.assertEqual(ClientErrorReport.objects.count(), 2)

    def test_metric_ingest(self):
        res = self.client.post(
            "/api/telemetry/metrics/",
            {
                "name": "session.started",
                "value": 1,
                "sessionId": "sess_1",
                "tags": {"subject": "Math"},
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_202_ACCEPTED)
        self.assertEqual(ProductMetric.objects.count(), 1)
        m = ProductMetric.objects.get()
        self.assertEqual(m.name, "session.started")

    def test_metric_rejects_bad_name(self):
        res = self.client.post(
            "/api/telemetry/metrics/",
            {"name": "DROP TABLE;"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class ObservabilitySummaryTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        now = timezone.now()
        ProductMetric.objects.create(name="session.started", value=1, session_id="s1")
        ProductMetric.objects.create(
            name="session.first_message", value=1200, session_id="s1"
        )
        ProductMetric.objects.create(name="session.drop_off", value=1, session_id="s2")
        ClientErrorReport.objects.create(
            kind=ClientErrorReport.Kind.GEMINI, message="boom"
        )
        LearningEvent.objects.create(
            client_event_id="evt_offer_1",
            event_type=LearningEventType.INTERVENTION_OFFERED,
            timestamp=now,
            payload={},
            context={},
        )
        LearningEvent.objects.create(
            client_event_id="evt_enter_1",
            event_type=LearningEventType.INTERVENTION_ENTERED,
            timestamp=now,
            payload={},
            context={},
        )

    def test_summary_shape(self):
        res = self.client.get("/api/telemetry/summary/?hours=24")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.data
        self.assertIn("tutoring_health", data)
        self.assertEqual(data["funnel"]["sessions_started"], 1)
        self.assertEqual(data["funnel"]["sessions_with_first_message"], 1)
        self.assertEqual(data["client_errors"]["total"], 1)
        self.assertGreaterEqual(data["interventions"]["offered"], 1)
        self.assertGreaterEqual(data["interventions"]["entered"], 1)


class RequestLoggingMiddlewareTests(TestCase):
    def test_request_id_header_echoed(self):
        client = APIClient()
        res = client.get("/health/live/", HTTP_X_REQUEST_ID="test-req-id-123")
        self.assertEqual(res["X-Request-ID"], "test-req-id-123")
