import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PlatformSubscription",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "plan",
                    models.CharField(
                        choices=[
                            ("spark", "Spark"),
                            ("ember", "Ember"),
                            ("forge", "Forge"),
                        ],
                        default="spark",
                        max_length=32,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("trialing", "Trialing"),
                            ("active", "Active"),
                            ("past_due", "Past due"),
                            ("canceled", "Canceled"),
                            ("incomplete", "Incomplete"),
                        ],
                        default="active",
                        max_length=32,
                    ),
                ),
                (
                    "billing_cycle",
                    models.CharField(
                        choices=[("monthly", "Monthly"), ("yearly", "Yearly")],
                        default="monthly",
                        max_length=16,
                    ),
                ),
                ("current_period_start", models.DateTimeField(blank=True, null=True)),
                ("current_period_end", models.DateTimeField(blank=True, null=True)),
                ("cancel_at_period_end", models.BooleanField(default=False)),
                ("entitlements_override", models.JSONField(blank=True, default=dict)),
                ("notes", models.CharField(blank=True, default="", max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="platform_subscription",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-updated_at"],
            },
        ),
        migrations.CreateModel(
            name="AiRoutingPreference",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "routing_mode",
                    models.CharField(
                        choices=[
                            ("platform", "Platform"),
                            ("byok", "Bring your own key"),
                            ("auto", "Auto (BYOK when available)"),
                        ],
                        default="auto",
                        max_length=16,
                    ),
                ),
                ("primary_provider", models.CharField(default="gemini", max_length=64)),
                (
                    "primary_model",
                    models.CharField(default="gemini-3.1-flash-lite", max_length=128),
                ),
                ("fallback_provider", models.CharField(blank=True, default="", max_length=64)),
                ("fallback_model", models.CharField(blank=True, default="", max_length=128)),
                ("task_routes", models.JSONField(blank=True, default=dict)),
                ("key_fingerprints", models.JSONField(blank=True, default=dict)),
                ("advanced", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ai_routing",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "AI routing preference",
                "verbose_name_plural": "AI routing preferences",
            },
        ),
    ]
