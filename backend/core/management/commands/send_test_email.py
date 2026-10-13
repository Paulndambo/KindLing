"""Send one operator-requested message through the configured email backend."""

from django.conf import settings
from django.core.mail import send_mail
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Send a test email to verify the configured SMTP/ESP delivery path."

    def add_arguments(self, parser):
        parser.add_argument("recipient", help="The explicit address that should receive the test.")

    def handle(self, *args, **options):
        backend = getattr(settings, "EMAIL_BACKEND", "")
        if not backend.endswith("smtp.EmailBackend"):
            raise CommandError(
                "Email is not configured with SMTP. Set EMAIL_HOST and provider credentials first."
            )

        recipient = options["recipient"].strip()
        if not recipient or "@" not in recipient:
            raise CommandError("Provide a valid recipient email address.")

        try:
            sent = send_mail(
                subject="Kindling email delivery check",
                message=(
                    "This is an operator-requested test message from Kindling. "
                    "If you received it, the configured email delivery path is working."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient],
                fail_silently=False,
            )
        except Exception as exc:
            raise CommandError(f"Email delivery failed: {exc}") from exc

        if sent != 1:
            raise CommandError("The email backend did not confirm sending the test message.")
        self.stdout.write(self.style.SUCCESS("Test email accepted by the configured backend."))
