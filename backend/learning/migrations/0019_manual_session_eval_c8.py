# Epic C8.3 — manual session eval rubric storage

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("learning", "0018_pedagogy_decision_l2"),
    ]

    operations = [
        migrations.CreateModel(
            name="ManualSessionEval",
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
                ("client_session_key", models.CharField(db_index=True, max_length=64)),
                (
                    "cohort",
                    models.CharField(
                        blank=True,
                        db_index=True,
                        default="beta-c8.3",
                        help_text="e.g. beta-c8.3 or beta-10-2026-09",
                        max_length=80,
                    ),
                ),
                ("rubric_version", models.PositiveSmallIntegerField(default=1)),
                ("scores", models.JSONField(blank=True, default=dict)),
                ("dimension_notes", models.JSONField(blank=True, default=dict)),
                ("overall_notes", models.TextField(blank=True, default="")),
                ("scorer", models.CharField(blank=True, default="", max_length=120)),
                ("evidence", models.JSONField(blank=True, default=dict)),
                ("weighted_mean", models.FloatField(blank=True, null=True)),
                ("completeness", models.FloatField(blank=True, null=True)),
                ("scored_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "lesson_session",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="manual_evals",
                        to="learning.lessonsession",
                    ),
                ),
            ],
            options={
                "verbose_name": "Manual session eval (C8.3)",
                "verbose_name_plural": "Manual session evals (C8.3)",
                "ordering": ["-scored_at"],
            },
        ),
        migrations.AddIndex(
            model_name="manualsessioneval",
            index=models.Index(
                fields=["cohort", "-scored_at"],
                name="learning_ma_cohort_scored_idx",
            ),
        ),
        migrations.AddConstraint(
            model_name="manualsessioneval",
            constraint=models.UniqueConstraint(
                fields=("client_session_key", "cohort"),
                name="uniq_manual_eval_client_session_cohort",
            ),
        ),
    ]
