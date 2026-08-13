from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import AiRoutingPreference, PlanId, PlatformSubscription

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
