from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("students", "0006_student_target_date"),
    ]

    operations = [
        migrations.AddField(
            model_name="studentprofile",
            name="preferred_language",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Language the learner prefers for tutoring and explanations.",
                max_length=80,
            ),
        ),
    ]
