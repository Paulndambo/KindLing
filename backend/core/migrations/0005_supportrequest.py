import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0004_opsreviewflag"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SupportRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("category", models.CharField(choices=[("technical", "Technical issue"), ("account", "Account access"), ("billing", "Billing"), ("accessibility", "Accessibility"), ("other", "Other feedback")], db_index=True, max_length=24)),
                ("status", models.CharField(choices=[("new", "New"), ("in_progress", "In progress"), ("resolved", "Resolved")], db_index=True, default="new", max_length=16)),
                ("priority", models.CharField(choices=[("normal", "Normal"), ("high", "High")], db_index=True, default="normal", max_length=12)),
                ("subject", models.CharField(max_length=120)),
                ("message", models.TextField(max_length=3000)),
                ("contact_email", models.EmailField(blank=True, default="", max_length=254)),
                ("notification_sent", models.BooleanField(default=False)),
                ("internal_notes", models.TextField(blank=True, default="")),
                ("user", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="support_requests", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="supportrequest",
            index=models.Index(fields=["status", "priority", "-created_at"], name="core_support_status_9a618f_idx"),
        ),
    ]
