"""
Structured logging helpers for Kindling observability.

Log lines are JSON-serializable dicts so they can be grepped, shipped to a
log aggregator, or inspected in local console output.
"""

from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Mapping, Optional

logger = logging.getLogger("kindling")

# Light PII scrubbers — never perfect, but avoid obvious leaks in logs/metrics.
_EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
_LONG_DIGIT_RE = re.compile(r"\b\d{6,}\b")
_BEARER_RE = re.compile(r"(?i)(bearer\s+)[A-Za-z0-9\-._~+/]+=*")


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def sanitize_text(value: Any, *, max_len: int = 200) -> str:
    """Truncate and scrub common PII patterns from free-text fields."""
    if value is None:
        return ""
    text = str(value)
    text = _EMAIL_RE.sub("[email]", text)
    text = _BEARER_RE.sub(r"\1[redacted]", text)
    text = _LONG_DIGIT_RE.sub("[digits]", text)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > max_len:
        text = text[: max_len - 1] + "…"
    return text


def sanitize_extra(extra: Optional[Mapping[str, Any]], *, max_keys: int = 20) -> dict:
    """Keep a small, scrubbed dict of extra context (no nested blobs)."""
    if not extra or not isinstance(extra, Mapping):
        return {}
    out: dict[str, Any] = {}
    for i, (key, value) in enumerate(extra.items()):
        if i >= max_keys:
            break
        safe_key = sanitize_text(key, max_len=40) or f"k{i}"
        if isinstance(value, (int, float, bool)) or value is None:
            out[safe_key] = value
        elif isinstance(value, str):
            out[safe_key] = sanitize_text(value, max_len=120)
        else:
            out[safe_key] = sanitize_text(value, max_len=80)
    return out


def log_event(
    event: str,
    *,
    level: int = logging.INFO,
    **fields: Any,
) -> None:
    """
    Emit a single structured log line.

    Format: kindling | {"event": "...", ...fields}
    """
    payload = {
        "event": event,
        "ts": utc_now_iso(),
        **{k: v for k, v in fields.items() if v is not None},
    }
    try:
        line = json.dumps(payload, default=str, separators=(",", ":"))
    except (TypeError, ValueError):
        line = json.dumps(
            {"event": event, "ts": utc_now_iso(), "error": "serialize_failed"},
            separators=(",", ":"),
        )
    logger.log(level, "kindling | %s", line)
