# Subject → Topic → Subtopic hierarchy

import django.db.models.deletion
from django.db import migrations, models


def forwards_flatten_to_subtopics(apps, schema_editor):
    """Each existing Topic becomes a unit with one Subtopic of the same name."""
    Topic = apps.get_model("curriculum", "Topic")
    Subtopic = apps.get_model("curriculum", "Subtopic")
    for topic in Topic.objects.all().iterator():
        if Subtopic.objects.filter(topic_id=topic.id).exists():
            continue
        Subtopic.objects.create(
            topic_id=topic.id,
            name=topic.name,
            sort_order=0,
            familiarity=getattr(topic, "familiarity", "new") or "new",
            learning_goal=getattr(topic, "learning_goal", "") or "",
        )


def backwards_noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("curriculum", "0006_topic_familiarity_goals"),
    ]

    operations = [
        migrations.CreateModel(
            name="Subtopic",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("name", models.CharField(max_length=200)),
                ("sort_order", models.PositiveIntegerField(default=0)),
                (
                    "familiarity",
                    models.CharField(
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
                ("learning_goal", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "topic",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="subtopics",
                        to="curriculum.topic",
                    ),
                ),
            ],
            options={
                "ordering": ["sort_order", "name"],
            },
        ),
        migrations.AddIndex(
            model_name="subtopic",
            index=models.Index(
                fields=["topic", "sort_order"], name="curriculum__topic_i_7b2c1a_idx"
            ),
        ),
        migrations.RunPython(forwards_flatten_to_subtopics, backwards_noop),
    ]
