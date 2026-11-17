from django.db import migrations, models


def migrate_legacy_plans(apps, schema_editor):
    Subscription = apps.get_model("kindling_platform", "PlatformSubscription")
    Invoice = apps.get_model("kindling_platform", "BillingInvoice")
    Subscription.objects.filter(plan__in=("ember", "forge")).update(plan="premium")
    Invoice.objects.filter(plan__in=("ember", "forge")).update(plan="premium")


def restore_legacy_plans(apps, schema_editor):
    Subscription = apps.get_model("kindling_platform", "PlatformSubscription")
    Invoice = apps.get_model("kindling_platform", "BillingInvoice")
    Subscription.objects.filter(plan="premium").update(plan="ember")
    Invoice.objects.filter(plan="premium").update(plan="ember")


class Migration(migrations.Migration):
    dependencies = [("kindling_platform", "0002_billinginvoice_platformaidailyusage")]

    operations = [
        migrations.RunPython(migrate_legacy_plans, restore_legacy_plans),
        migrations.AlterField(
            model_name="platformsubscription",
            name="plan",
            field=models.CharField(
                choices=[("spark", "Spark"), ("premium", "Premium")],
                default="spark",
                max_length=32,
            ),
        ),
        migrations.AlterField(
            model_name="billinginvoice",
            name="plan",
            field=models.CharField(
                choices=[("spark", "Spark"), ("premium", "Premium")],
                max_length=32,
            ),
        ),
    ]
