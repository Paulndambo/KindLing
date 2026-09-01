from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("students", "0004_focus_subjects"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentprofile",
            name="week_focus",
            field=models.CharField(
                blank=True,
                default="",
                help_text="One-line 'this week I'm working on…' reminder for the learner.",
                max_length=240,
            ),
        ),
    ]
