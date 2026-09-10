# Epic L4 — independence twin event types

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("learning", "0019_manual_session_eval_c8"),
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
                    ("assessment.started", "Assessment started"),
                    ("assessment.answered", "Assessment item answered"),
                    ("assessment.completed", "Assessment completed"),
                    ("assessment.exited", "Assessment exited"),
                    ("learning.adi", "Assistance dependency index"),
                    ("pedagogy.decision", "Pedagogical decision"),
                    ("independence.offered", "Independence twin offered"),
                    ("independence.started", "Independence twin started"),
                    ("independence.answered", "Independence twin answered"),
                    ("independence.completed", "Independence twin completed"),
                    ("independence.declined", "Independence twin declined"),
                    ("independence.skipped", "Independence twin skipped"),
                ],
                max_length=64,
            ),
        ),
    ]
