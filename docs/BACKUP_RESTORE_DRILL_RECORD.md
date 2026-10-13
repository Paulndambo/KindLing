# Backup and restore drill record

Complete one record per exercise. Run only in an isolated staging environment with a separate restore target. Never place credentials, student records, or backup contents in this file or Git; store evidence in access-controlled operations storage and reference it by identifier only.

## Exercise details

- Exercise date/time (UTC):
- Operator(s):
- Environment / release:
- Restore target name (must not be production):
- Change or incident that prompted the drill (if applicable):

## Recovery points

- Database backup/PITR reference (no secret URL):
- Database backup timestamp (UTC):
- Media backup reference (no secret URL):
- Media backup timestamp (UTC):
- Expected recovery point objective (RPO):
- Actual data loss window / observed RPO:

## Procedure and results

- [ ] Restore database into a separate, empty temporary database.
- [ ] Point an isolated deployment at the restored database.
- [ ] `python manage.py migrate --check` succeeds.
- [ ] `GET /health/ready/` succeeds against the restored database.
- [ ] Restore media separately and confirm a non-sensitive sample file is readable.
- [ ] Disable outbound email, billing actions, and AI provider calls during the exercise.
- [ ] Confirm no production data or service was changed by the drill.
- [ ] Store command output/screenshots in approved access-controlled evidence storage.

- Database restore duration:
- Media restore duration:
- Total recovery time / observed RTO:
- Expected recovery time objective (RTO):
- Result: Pass / Partial / Fail

## Findings and sign-off

- Issues found:
- Follow-up owner and due date:
- Evidence reference (access-controlled location):
- Operator sign-off and date:
- Reviewer sign-off and date:

