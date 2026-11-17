from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("students", "0008_studentprofile_daily_reminder_enabled_and_more")]
    operations = [migrations.AddField(
        model_name="studentprofile", name="date_of_birth",
        field=models.DateField(blank=True, null=True),
    )]
