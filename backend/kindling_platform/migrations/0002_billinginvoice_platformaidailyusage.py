import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("kindling_platform", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="BillingInvoice",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("plan", models.CharField(choices=[("spark", "Spark"), ("ember", "Ember"), ("forge", "Forge")], max_length=32)),
                ("billing_cycle", models.CharField(choices=[("monthly", "Monthly"), ("yearly", "Yearly")], max_length=16)),
                ("amount", models.DecimalField(decimal_places=2, max_digits=9)),
                ("currency", models.CharField(default="USD", max_length=3)),
                ("status", models.CharField(choices=[("requested", "Requested"), ("paid", "Paid"), ("void", "Void")], default="requested", max_length=16)),
                ("payment_reference", models.CharField(blank=True, default="", max_length=160)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                ("marked_paid_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="marked_kindling_invoices_paid", to=settings.AUTH_USER_MODEL)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="kindling_invoices", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="billinginvoice",
            index=models.Index(fields=["user", "status", "-created_at"], name="kindling_pl_user_id_9003b6_idx"),
        ),
        migrations.CreateModel(
            name="PlatformAiDailyUsage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("usage_date", models.DateField()),
                ("request_count", models.PositiveIntegerField(default=0)),
                ("estimated_tokens", models.PositiveIntegerField(default=0)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="platform_ai_daily_usage", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.AddConstraint(
            model_name="platformaidailyusage",
            constraint=models.UniqueConstraint(fields=("user", "usage_date"), name="unique_platform_ai_daily_usage"),
        ),
        migrations.AddIndex(
            model_name="platformaidailyusage",
            index=models.Index(fields=["usage_date", "user"], name="kindling_pl_usage_d_759ae5_idx"),
        ),
    ]
