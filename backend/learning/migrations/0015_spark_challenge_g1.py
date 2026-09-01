# Epic G1 — light spark challenge event types

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("learning", "0014_skill_review_c1"),
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
                    ("challenge.started", "Spark challenge started"),
                    ("challenge.completed", "Spark challenge completed"),
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
    ]
