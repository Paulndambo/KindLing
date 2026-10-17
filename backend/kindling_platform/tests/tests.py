from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from ..models import AiRoutingPreference, PlanId, PlatformSubscription
from ..serializers import ensure_subscription
from ..usage import daily_ai_usage, reserve_daily_ai_request

User = get_user_model()


class PlatformApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="pilot@kindling.edu",
            email="pilot@kindling.edu",
            password="test-pass-12345",
        )

    def test_plan_catalog_public(self):
        res = self.client.get("/api/platform/plans/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        ids = {p["id"] for p in res.data["plans"]}
        self.assertEqual(ids, {"spark", "ember", "forge"})

    def test_subscription_requires_auth(self):
        res = self.client.get("/api/platform/subscription/")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_subscription_defaults_to_spark(self):
        self.client.force_authenticate(self.user)
        res = self.client.get("/api/platform/subscription/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["plan"], PlanId.SPARK)
        self.assertTrue(res.data["entitlements"]["platformAi"])

    def test_select_plan(self):
        self.client.force_authenticate(self.user)
        res = self.client.post(
            "/api/platform/subscription/",
            {"plan": "forge", "billing_cycle": "yearly"},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["plan"], "forge")
        self.assertTrue(res.data["entitlements"]["advancedRouting"])
        sub = PlatformSubscription.objects.get(user=self.user)
        self.assertEqual(sub.billing_cycle, "yearly")

    def test_ai_routing_rejects_raw_keys(self):
        self.client.force_authenticate(self.user)
        res = self.client.patch(
            "/api/platform/ai-routing/",
            {
                "routing_mode": "byok",
                "key_fingerprints": {
                    "openai": {"apiKey": "sk-secret", "fingerprint": "dead"}
                },
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_ai_routing_update(self):
        self.client.force_authenticate(self.user)
        res = self.client.patch(
            "/api/platform/ai-routing/",
            {
                "routing_mode": "byok",
                "primary_provider": "openai",
                "primary_model": "gpt-4o-mini",
                "key_fingerprints": {
                    "openai": {
                        "fingerprint": "ab12cd34",
                        "label": "Work",
                        "hasKey": True,
                    }
                },
                "task_routes": {
                    "chat": {"provider": "openai", "model": "gpt-4o-mini"},
                    "vision": {"provider": "gemini", "model": "gemini-2.0-flash"},
                },
            },
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["primary_provider"], "openai")
        pref = AiRoutingPreference.objects.get(user=self.user)
        self.assertEqual(pref.routing_mode, "byok")
        self.assertNotIn("apiKey", str(pref.key_fingerprints))

    def test_daily_ai_cap_is_per_user_and_consumes_full_allocation(self):
        other_user = User.objects.create_user(
            username="second@kindling.edu",
            email="second@kindling.edu",
            password="test-pass-12345",
        )
        sub_a = ensure_subscription(self.user)
        sub_b = ensure_subscription(other_user)

        # User A consumes 992,605 of 1,000,000 tokens, then makes another 8,000-token turn
        first = reserve_daily_ai_request(self.user, sub_a, 992605)
        self.assertTrue(first["allowed"])
        self.assertEqual(first["estimatedTokenLimit"], 1000000)
        self.assertEqual(first["estimatedTokensRemaining"], 7395)

        # User A still has 7,395 tokens left and can consume the rest of their allocation
        second = reserve_daily_ai_request(self.user, sub_a, 8000)
        self.assertTrue(second["allowed"])
        self.assertEqual(second["estimatedTokensRemaining"], 0)

        # Now User A has exhausted their allocation and is blocked
        third = reserve_daily_ai_request(self.user, sub_a, 1000)
        self.assertFalse(third["allowed"])
        self.assertEqual(third["estimatedTokensRemaining"], 0)

        # User B is completely unaffected by User A exhausting their cap
        usage_b = daily_ai_usage(other_user, sub_b)
        self.assertEqual(usage_b["used"], 0)
        self.assertEqual(usage_b["estimatedTokensRemaining"], 1000000)
        res_b = reserve_daily_ai_request(other_user, sub_b, 5000)
        self.assertTrue(res_b["allowed"])
        self.assertEqual(res_b["used"], 1)
        self.assertEqual(res_b["estimatedTokensRemaining"], 995000)

    def test_platform_gemini_missing_key_returns_503(self):
        from django.test import override_settings

        ensure_subscription(self.user)
        self.client.force_authenticate(self.user)
        with override_settings(PLATFORM_GEMINI_API_KEY=""):
            res = self.client.post(
                "/api/platform/ai/gemini/",
                {
                    "model": "gemini-3.1-flash-lite",
                    "contents": "Hello",
                },
                format="json",
            )
        self.assertEqual(res.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("PLATFORM_GEMINI_API_KEY", res.data["detail"])



