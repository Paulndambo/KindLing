"""
Homework image upload safety helpers (Epic A4).
"""

from __future__ import annotations

from typing import Tuple

# Soft limits for child product
MAX_HOMEWORK_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_CONTENT_TYPES = frozenset(
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
    }
)
ALLOWED_EXTENSIONS = frozenset({".jpg", ".jpeg", ".png", ".webp", ".gif"})

# Names that often indicate non-homework / risky payloads
REJECT_NAME_HINTS = (
    "password",
    "ssn",
    "creditcard",
    "credit-card",
)


def validate_homework_file(
    *,
    content_type: str,
    byte_size: int,
    filename: str = "",
) -> Tuple[bool, str]:
    """
    Return (ok, reason). reason empty when ok.
    """
    ct = (content_type or "").split(";")[0].strip().lower()
    if ct not in ALLOWED_CONTENT_TYPES:
        return False, "Only JPEG, PNG, WebP, or GIF images are allowed."

    if byte_size <= 0:
        return False, "Empty file."
    if byte_size > MAX_HOMEWORK_BYTES:
        return False, "Image is too large (max 5 MB)."

    name = (filename or "").lower()
    if any(h in name for h in REJECT_NAME_HINTS):
        return False, "This file name is not allowed for homework upload."

    # Extension check (best-effort)
    import os

    ext = os.path.splitext(name)[1]
    if ext and ext not in ALLOWED_EXTENSIONS:
        return False, "Unsupported file extension."

    return True, ""


def sanitize_analysis(payload: dict | None) -> dict:
    """Keep analysis JSON small and free of unnecessary blobs."""
    if not payload or not isinstance(payload, dict):
        return {}
    out = {}
    for key in (
        "problem",
        "studentWork",
        "errors",
        "focusSkill",
        "suggestedApproach",
        "confidence",
        "isHomework",
        "language",
        "notes",
    ):
        if key not in payload:
            continue
        val = payload[key]
        if key == "errors" and isinstance(val, list):
            out[key] = [str(x)[:240] for x in val[:8]]
        elif key == "confidence":
            try:
                out[key] = max(0.0, min(1.0, float(val)))
            except (TypeError, ValueError):
                out[key] = 0.0
        elif key == "isHomework":
            out[key] = bool(val)
        else:
            out[key] = str(val)[:2000] if not isinstance(val, (dict, list)) else val
    return out
