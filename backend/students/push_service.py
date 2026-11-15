"""
Expo Push Service client for delivering remote push notifications to registered
student mobile devices.
"""

from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .models import StudentPushDevice

EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send"


def is_valid_expo_push_token(token: str) -> bool:
    cleaned = (token or "").strip()
    return (
        cleaned.startswith("ExponentPushToken[")
        or cleaned.startswith("ExpoPushToken[")
    ) and cleaned.endswith("]")


def send_expo_push_to_user(
    user,
    *,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Send a push notification to all active StudentPushDevice records for a user.
    Returns delivery summary { sent: int, failed: int, devices: int, tickets: [...] }.
    """
    devices = list(
        StudentPushDevice.objects.filter(user=user, is_active=True)
    )
    valid_devices = [
        d for d in devices if is_valid_expo_push_token(d.expo_push_token)
    ]

    if not valid_devices:
        return {
            "sent": 0,
            "failed": 0,
            "devices": len(devices),
            "detail": "No active Expo push tokens registered for this account.",
        }

    messages = [
        {
            "to": device.expo_push_token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {},
            "priority": "high",
            "channelId": "kindling-reminders",
        }
        for device in valid_devices
    ]

    payload = json.dumps(messages).encode("utf-8")
    req = Request(
        EXPO_PUSH_ENDPOINT,
        data=payload,
        headers={
            "Accept": "application/json",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(req, timeout=10) as response:
            raw = response.read().decode("utf-8")
            parsed = json.loads(raw) if raw else {}
    except (HTTPError, URLError, TimeoutError, ValueError) as exc:
        return {
            "sent": 0,
            "failed": len(valid_devices),
            "devices": len(valid_devices),
            "detail": f"Expo push gateway error: {exc}",
        }

    tickets = parsed.get("data") if isinstance(parsed, dict) else []
    if not isinstance(tickets, list):
        tickets = []

    sent = 0
    failed = 0
    for idx, ticket in enumerate(tickets):
        if not isinstance(ticket, dict):
            continue
        if ticket.get("status") == "ok":
            sent += 1
        else:
            failed += 1
            details = ticket.get("details") or {}
            if (
                isinstance(details, dict)
                and details.get("error") == "DeviceNotRegistered"
                and idx < len(valid_devices)
            ):
                valid_devices[idx].is_active = False
                valid_devices[idx].save(update_fields=["is_active", "last_seen_at"])

    return {
        "sent": sent,
        "failed": failed,
        "devices": len(valid_devices),
        "tickets": tickets,
    }
