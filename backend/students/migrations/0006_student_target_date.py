from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("students", "0005_week_focus_c5"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentprofile",
            name="target_label",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="target_date",
            field=models.DateField(blank=True, null=True),
        ),
    ]
