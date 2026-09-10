"""Epic C8.2 — weekly eval sample job + pipeline tests."""

from datetime import timedelta
from io import StringIO
from pathlib import Path
import tempfile

from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from core.jobs import list_jobs, run_job
from core.models import JobRun
from learning.eval_weekly import (
    COHORT_PREFIX,
    run_weekly_eval_sample,
    select_weekly_sessions,
    weekly_cohort_id,
)
from learning.models import LessonSession, ManualSessionEval, SessionTurn


class EvalWeeklyUnitTests(TestCase):
    def setUp(self):
        now = timezone.now()
        self.now = now
        for i in range(3):
            s = LessonSession.objects.create(
                session_id=f"sess-w-{i}",
                client_student_id="wk",
                subject="CS",
                topic=f"Topic {i}",
                started_at=now - timedelta(days=i, hours=1),
                turn_count=2,
                accuracy=0.5,
                counters={"hints": 1},
            )
            SessionTurn.objects.create(
                session=s,
                index=0,
                occurred_at=now,
                student_text="hi",
                tutor_text="What do you think? Take your time.",
                correctness="partial",
            )
            SessionTurn.objects.create(
                session=s,
                index=1,
                occurred_at=now,
                student_text="ok",
                tutor_text="Great try — for example, a battery stores energy.",
                correctness="correct",
            )

    def test_cohort_id_format(self):
        cid = weekly_cohort_id(self.now)
        self.assertTrue(cid.startswith(COHORT_PREFIX))
        self.assertIn("-W", cid)

    def test_select_sessions(self):
        sessions = select_weekly_sessions(lookback_days=7, limit=10, min_turns=2)
        self.assertGreaterEqual(len(sessions), 3)

    def test_run_dry_run_no_persist(self):
        result = run_weekly_eval_sample(
            dry_run=True, lookback_days=7, limit=5, write_report=False
        )
        self.assertTrue(result.get("ok"))
        self.assertEqual(result.get("saved"), 0)
        self.assertGreaterEqual(result.get("scoredOk"), 1)
        self.assertEqual(ManualSessionEval.objects.count(), 0)

    def test_run_saves_and_writes_report(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = run_weekly_eval_sample(
                dry_run=False,
                lookback_days=7,
                limit=5,
                save=True,
                write_report=True,
                report_dir=Path(tmp),
                cohort="auto-weekly-test",
            )
            self.assertGreaterEqual(result.get("saved"), 1)
            self.assertEqual(
                ManualSessionEval.objects.filter(cohort="auto-weekly-test").count(),
                result["saved"],
            )
            paths = result.get("reportPaths") or {}
            md = Path(tmp) / paths["markdown"]
            js = Path(tmp) / paths["json"]
            self.assertTrue(md.is_file())
            self.assertTrue(js.is_file())
            self.assertIn("C8.2", md.read_text(encoding="utf-8"))


class EvalWeeklyJobTests(TestCase):
    def setUp(self):
        now = timezone.now()
        s = LessonSession.objects.create(
            session_id="sess-job-w",
            client_student_id="j",
            subject="CS",
            topic="T",
            started_at=now,
            turn_count=2,
            accuracy=0.6,
        )
        SessionTurn.objects.create(
            session=s,
            index=0,
            occurred_at=now,
            student_text="a",
            tutor_text="Why? Take your time.",
            correctness="incorrect",
        )
        SessionTurn.objects.create(
            session=s,
            index=1,
            occurred_at=now,
            student_text="b",
            tutor_text="Nice thinking — imagine a USB stick.",
            correctness="correct",
        )

    def test_job_registered(self):
        jobs = list_jobs()
        self.assertIn("weekly_eval_sample", jobs)
        self.assertGreaterEqual(jobs["weekly_eval_sample"].interval_seconds, 7 * 24 * 3600 - 1)

    def test_run_job_dry_run(self):
        run = run_job("weekly_eval_sample", dry_run=True, trigger="test")
        self.assertEqual(run.status, JobRun.Status.SUCCESS)
        self.assertTrue(run.result.get("dry_run"))
        self.assertEqual(run.result.get("job"), "weekly_eval_sample")
        self.assertEqual(run.result.get("saved"), 0)

    @override_settings(MEDIA_ROOT=tempfile.mkdtemp())
    def test_run_job_persists(self):
        run = run_job("weekly_eval_sample", dry_run=False, trigger="test")
        self.assertEqual(run.status, JobRun.Status.SUCCESS)
        self.assertGreaterEqual(run.result.get("scoredOk", 0), 1)
        self.assertGreaterEqual(run.result.get("saved", 0), 1)
        self.assertTrue(
            ManualSessionEval.objects.filter(
                cohort__startswith=COHORT_PREFIX
            ).exists()
        )

    def test_management_command(self):
        out = StringIO()
        call_command("eval_weekly_sample", "--dry-run", stdout=out)
        self.assertIn("Cohort:", out.getvalue())

    def test_run_job_list_includes_weekly_eval(self):
        out = StringIO()
        call_command("run_job", "list", stdout=out)
        self.assertIn("weekly_eval_sample", out.getvalue())
