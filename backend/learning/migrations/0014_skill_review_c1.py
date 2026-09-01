# Generated manually for Epic C1 — spaced review / Review spark

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("curriculum", "0006_topic_familiarity_goals"),
        ("learning", "0013_session_reflect_b8"),
    ]

    operations = [
        migrations.AlterField(
            model_name="learningevent",
            name="event_type",
            field=models.CharField(
                choices=[
                    ("session.start", "Session start"),
                    ("session.end", "Session end"),
                    ("session.reflect", "Session reflection"),
                    ("review.started", "Review started"),
                    ("review.completed", "Review completed"),
                    ("turn.exchange", "Turn exchange"),
                    ("behavior.hint_requested", "Hint requested"),
                    ("behavior.tool_toggled", "Tool toggled"),
                    ("session.topic_switched", "Topic switched"),
                    ("behavior.voice_input", "Voice input"),
                    ("profile.snapshot", "Profile snapshot"),
                    ("intervention.offered", "Intervention offered"),
                    ("intervention.entered", "Intervention entered"),
                    ("intervention.exited", "Intervention exited"),
                    ("intervention.declined", "Intervention declined"),
                    ("behavior.manipulative_used", "Manipulative used"),
                    ("struggle.signal", "Struggle signal"),
                    ("affect.checkin", "Affect check-in"),
                    ("affect.persistence", "Persistence noted"),
                    ("misconception.detected", "Misconception detected"),
                    ("misconception.remediated", "Misconception remediated"),
                    ("multistep.started", "Multi-step started"),
                    ("multistep.step", "Multi-step step checked"),
                    ("multistep.completed", "Multi-step completed"),
                    ("multistep.exited", "Multi-step exited"),
                ],
                max_length=64,
            ),
        ),
        migrations.CreateModel(
            name="SkillReviewItem",
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
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("scheduled", "Scheduled"),
                            ("due", "Due"),
                            ("completed", "Completed"),
                            ("skipped", "Skipped"),
                        ],
                        db_index=True,
                        default="scheduled",
                        max_length=20,
                    ),
                ),
                ("due_at", models.DateTimeField(db_index=True)),
                ("reason", models.CharField(blank=True, default="", max_length=40)),
                (
                    "priority",
                    models.FloatField(
                        default=0.5,
                        help_text="Higher = show first among due items",
                    ),
                ),
                ("interval_days", models.FloatField(default=1.0)),
                ("ease", models.FloatField(default=2.3)),
                ("repetitions", models.PositiveIntegerField(default=0)),
                ("last_outcome", models.CharField(blank=True, default="", max_length=20)),
                ("last_reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("subject_name", models.CharField(blank=True, default="", max_length=160)),
                ("topic_name", models.CharField(blank=True, default="", max_length=200)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "profile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="skill_reviews",
                        to="learning.learningprofile",
                    ),
                ),
                (
                    "skill",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="review_items",
                        to="curriculum.skill",
                    ),
                ),
            ],
            options={
                "ordering": ["due_at", "-priority"],
            },
        ),
        migrations.AddConstraint(
            model_name="skillreviewitem",
            constraint=models.UniqueConstraint(
                fields=("profile", "skill"), name="uniq_profile_skill_review"
            ),
        ),
        migrations.AddIndex(
            model_name="skillreviewitem",
            index=models.Index(
                fields=["profile", "status", "due_at"],
                name="learning_sk_profile_7c1rev_idx",
            ),
        ),
    ]
