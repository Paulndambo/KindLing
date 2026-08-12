from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from io import StringIO
from rest_framework import status
from rest_framework.test import APIClient

from core.jobs import list_jobs, run_job, run_due_jobs
from core.jobs.registry import effective_schedule
from core.models import JobRun


class JobRegistryTests(TestCase):
    def test_heartbeat_registered(self):
        jobs = list_jobs()
        self.assertIn("heartbeat", jobs)
        self.assertIn("weekly_digest", jobs)
        self.assertIn("mastery_recompute", jobs)
        self.assertIn("review_schedule", jobs)

    def test_schedule_from_settings(self):
        sched = effective_schedule("heartbeat")
        self.assertTrue(sched["enabled"])
        self.assertGreater(sched["interval_seconds"], 0)


class JobRunnerTests(TestCase):
    def test_run_heartbeat_success(self):
        run = run_job("heartbeat", trigger="test")
        self.assertEqual(run.status, JobRun.Status.SUCCESS)
        self.assertTrue(run.result.get("ok"))
        self.assertEqual(run.result.get("job"), "heartbeat")
        self.assertIsNotNone(run.duration_ms)
        self.assertEqual(JobRun.objects.filter(name="heartbeat").count(), 1)

    def test_weekly_digest_dry_run(self):
        run = run_job("weekly_digest", dry_run=True, trigger="test")
        self.assertEqual(run.status, JobRun.Status.SUCCESS)
        self.assertTrue(run.result.get("dry_run"))
        self.assertEqual(run.result.get("emails_sent"), 0)

    def test_unknown_job_raises(self):
        with self.assertRaises(ValueError):
            run_job("does_not_exist")

    def test_disabled_job_skipped(self):
        with self.settings(
            KINDLING_JOBS={
                "heartbeat": {"enabled": False, "interval_seconds": 3600},
            }
        ):
            run = run_job("heartbeat", trigger="test")
            self.assertEqual(run.status, JobRun.Status.SKIPPED)

    def test_force_runs_disabled(self):
        with self.settings(
            KINDLING_JOBS={
                "heartbeat": {"enabled": False, "interval_seconds": 3600},
            }
        ):
            run = run_job("heartbeat", trigger="test", force=True)
            self.assertEqual(run.status, JobRun.Status.SUCCESS)

    def test_run_due_respects_interval(self):
        # First run should be due
        first = run_due_jobs()
        names = {r.name for r in first}
        self.assertIn("heartbeat", names)

        # Immediately again — heartbeat should not be due (interval 3600)
        second = run_due_jobs()
        second_hb = [r for r in second if r.name == "heartbeat"]
        self.assertEqual(second_hb, [])

    def test_run_due_force(self):
        run_job("heartbeat", trigger="test")
        forced = run_due_jobs(force=True)
        self.assertTrue(any(r.name == "heartbeat" for r in forced))


class JobManagementCommandTests(TestCase):
    def test_run_job_command(self):
        out = StringIO()
        call_command("run_job", "heartbeat", stdout=out)
        self.assertIn("success", out.getvalue())
        self.assertTrue(
            JobRun.objects.filter(
                name="heartbeat", status=JobRun.Status.SUCCESS
            ).exists()
        )

    def test_run_job_list(self):
        out = StringIO()
        call_command("run_job", "list", stdout=out)
        self.assertIn("heartbeat", out.getvalue())

    def test_run_scheduled_jobs_command(self):
        out = StringIO()
        call_command("run_scheduled_jobs", stdout=out)
        self.assertTrue(JobRun.objects.exists())


class JobsStatusApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_jobs_status(self):
        run_job("heartbeat", trigger="test")
        res = self.client.get("/api/jobs/status/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        names = [j["name"] for j in res.data["jobs"]]
        self.assertIn("heartbeat", names)
        hb = next(j for j in res.data["jobs"] if j["name"] == "heartbeat")
        self.assertEqual(hb["last_status"], "success")

    def test_health_with_jobs_flag(self):
        run_job("heartbeat", trigger="test")
        res = self.client.get("/health/?jobs=1")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("jobs", res.data)
        self.assertIsNotNone(res.data["jobs"]["heartbeat_last_success"])
