from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("students", "0003_parent_digest_a5"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentprofile",
            name="focus_subjects",
            field=models.JSONField(blank=True, default=list),
        ),
    ]