from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("learning", "0024_skillreviewattempt"),
    ]

    operations = [
        migrations.AddField(
            model_name="learningprofile",
            name="confidence_evidence_history",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
