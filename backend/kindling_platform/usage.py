"""Per-account daily request caps for the server-paid Gemini route."""

from django.db import transaction
from django.utils import timezone

from .models import PlatformAiDailyUsage
from .plans import plan_entitlements


def _compute_limit_reason(used: int, cap: int, tokens_used: int, token_cap: int) -> str | None:
    req_exhausted = cap > 0 and used >= cap
    tok_exhausted = token_cap > 0 and tokens_used >= token_cap
    if req_exhausted and tok_exhausted:
        return "both"
    if req_exhausted:
        return "requests"
    if tok_exhausted:
        return "tokens"
    return None


def daily_ai_usage(user, subscription):
    today = timezone.now().date()
    entitlements = plan_entitlements(
        subscription.plan, subscription.entitlements_override or {}
    )
    cap = int(entitlements.get("dailyPlatformAiRequests") or 0)
    token_cap = int(entitlements.get("dailyPlatformAiTokens") or 0)
    row = PlatformAiDailyUsage.objects.filter(user=user, usage_date=today).first()
    used = row.request_count if row else 0
    tokens_used = row.estimated_tokens if row else 0
    return {
        "used": used,
        "limit": cap,
        "remaining": max(0, cap - used),
        "estimatedTokensUsed": tokens_used,
        "estimatedTokenLimit": token_cap,
        "estimatedTokensRemaining": max(0, token_cap - tokens_used),
        "limitReason": _compute_limit_reason(used, cap, tokens_used, token_cap),
        "resetsAt": "midnight UTC",
        "softWarning": bool(
            (cap and used >= int(cap * 0.8))
            or (token_cap and tokens_used >= int(token_cap * 0.8))
        ),
    }


def reserve_daily_ai_request(user, subscription, estimated_tokens):
    """Atomically reserve one request, returning usage and whether it is allowed."""
    today = timezone.now().date()
    entitlements = plan_entitlements(
        subscription.plan, subscription.entitlements_override or {}
    )
    cap = int(entitlements.get("dailyPlatformAiRequests") or 0)
    token_cap = int(entitlements.get("dailyPlatformAiTokens") or 0)
    if cap <= 0 or token_cap <= 0:
        return {"allowed": False, **daily_ai_usage(user, subscription)}

    with transaction.atomic():
        row, _ = PlatformAiDailyUsage.objects.get_or_create(
            user=user,
            usage_date=today,
            defaults={"request_count": 0},
        )
        row = PlatformAiDailyUsage.objects.select_for_update().get(pk=row.pk)
        if row.request_count >= cap or row.estimated_tokens >= token_cap:
            usage = row.request_count
            tokens_used = row.estimated_tokens
            return {
                "allowed": False,
                "used": usage,
                "limit": cap,
                "remaining": max(0, cap - usage),
                "estimatedTokensUsed": tokens_used,
                "estimatedTokenLimit": token_cap,
                "estimatedTokensRemaining": max(0, token_cap - tokens_used),
                "limitReason": _compute_limit_reason(usage, cap, tokens_used, token_cap),
                "resetsAt": "midnight UTC",
                "softWarning": True,
            }
        row.request_count += 1
        row.estimated_tokens += max(1, int(estimated_tokens))
        row.save(update_fields=["request_count", "estimated_tokens", "updated_at"])
        return {
            "allowed": True,
            "used": row.request_count,
            "limit": cap,
            "remaining": max(0, cap - row.request_count),
            "estimatedTokensUsed": row.estimated_tokens,
            "estimatedTokenLimit": token_cap,
            "estimatedTokensRemaining": max(0, token_cap - row.estimated_tokens),
            "limitReason": _compute_limit_reason(
                row.request_count, cap, row.estimated_tokens, token_cap
            ),
            "resetsAt": "midnight UTC",
            "softWarning": (
                row.request_count >= int(cap * 0.8)
                or row.estimated_tokens >= int(token_cap * 0.8)
            ),
        }


def release_daily_ai_request(user, estimated_tokens: int) -> None:
    """Roll back a reserved request and its estimated tokens when an upstream provider call fails."""
    today = timezone.now().date()
    with transaction.atomic():
        row = (
            PlatformAiDailyUsage.objects.select_for_update()
            .filter(user=user, usage_date=today)
            .first()
        )
        if not row:
            return
        row.request_count = max(0, row.request_count - 1)
        row.estimated_tokens = max(0, row.estimated_tokens - max(1, int(estimated_tokens)))
        row.save(update_fields=["request_count", "estimated_tokens", "updated_at"])


def reconcile_daily_ai_tokens(user, reserved_tokens: int, actual_tokens: int) -> None:
    """Adjust today's token counter from the up-front reservation to actual token usage."""
    delta = int(actual_tokens) - int(reserved_tokens)
    if delta == 0:
        return
    today = timezone.now().date()
    with transaction.atomic():
        row = (
            PlatformAiDailyUsage.objects.select_for_update()
            .filter(user=user, usage_date=today)
            .first()
        )
        if not row:
            return
        row.estimated_tokens = max(0, row.estimated_tokens + delta)
        row.save(update_fields=["estimated_tokens", "updated_at"])

