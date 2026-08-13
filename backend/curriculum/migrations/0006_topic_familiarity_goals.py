from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("curriculum", "0005_multistep_b6"),
    ]

    operations = [
        migrations.AddField(
            model_name="subject",
            name="learning_goal",
            field=models.TextField(
                blank=True,
                default="",
                help_text="What the student wants from this subject overall.",
            ),
        ),
        migrations.AddField(
            model_name="topic",
            name="familiarity",
            field=models.CharField(
                blank=True,
                choices=[
                    ("new", "Brand new to me"),
                    ("beginner", "I've heard of it"),
                    ("some", "I know the basics"),
                    ("comfortable", "Fairly comfortable"),
                    ("reviewing", "Reviewing / exam prep"),
                ],
                db_index=True,
                default="new",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="topic",
            name="learning_goal",
            field=models.TextField(blank=True, default=""),
        ),
    ]
