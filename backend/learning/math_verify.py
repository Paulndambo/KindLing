"""
Math correctness verification for pilot graded turns (Epic A3).

Pure-Python Fraction arithmetic — no sympy required. Mirrors
frontend/src/services/learning/mathVerifier.js.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from fractions import Fraction
from typing import Any, Dict, List, Optional, Tuple

CHECK_TAG_RE = re.compile(
    r"⟦\s*check\b([^⟧]*)⟧|\[\[\s*check\s*:?\s*([^\]]+)\]\]",
    re.IGNORECASE,
)


def strip_math_check_tags(text: str) -> str:
    if not text:
        return ""
    cleaned = CHECK_TAG_RE.sub("", text)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def parse_check_tags(tutor_text: str) -> Dict[str, Any]:
    expected = None
    alts: List[str] = []
    result = None
    raw = None
    for m in CHECK_TAG_RE.finditer(tutor_text or ""):
        body = (m.group(1) or m.group(2) or "").strip()
        raw = m.group(0)
        exp_m = re.search(r"expected\s*=\s*[\"']?([^\"'\s|,;]+)[\"']?", body, re.I)
        if exp_m:
            expected = exp_m.group(1).strip()
        if not expected:
            bare = re.match(r"^([0-9./+\-x×*÷^()%\s]+)$", body, re.I)
            if bare:
                expected = bare.group(1).strip()
        alts_m = re.search(r"alts?\s*=\s*[\"']?([^\"']+)[\"']?", body, re.I)
        if alts_m:
            alts = [a.strip() for a in alts_m.group(1).split("|") if a.strip()]
        res_m = re.search(
            r"result\s*=\s*[\"']?(correct|incorrect|partial|wrong|right)[\"']?",
            body,
            re.I,
        )
        if res_m:
            r = res_m.group(1).lower()
            if r in ("right", "correct"):
                result = "correct"
            elif r in ("wrong", "incorrect"):
                result = "incorrect"
            elif r == "partial":
                result = "partial"
    return {
        "expected": expected,
        "alts": alts,
        "result": result,
        "raw": raw,
    }


def parse_math_value(raw: str) -> Optional[Fraction]:
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None

    s = s.replace("$", "")
    s = re.sub(
        r"\\frac\s*\{([^}]+)\}\s*\{([^}]+)\}", r"(\1)/(\2)", s, flags=re.I
    )
    s = s.replace("\\times", "*").replace("\\div", "/")
    s = s.replace("×", "*").replace("÷", "/").replace("−", "-")
    s = re.sub(r"\s+", " ", s).strip()

    pct = re.match(r"^(-?\d+(?:\.\d+)?)\s*%$", s)
    if pct:
        return Fraction(pct.group(1)) / 100

    mixed = re.match(r"^(-?\d+)\s+(\d+)\s*/\s*(\d+)$", s)
    if mixed:
        whole = int(mixed.group(1))
        n = int(mixed.group(2))
        d = int(mixed.group(3))
        sign = -1 if whole < 0 else 1
        return Fraction(sign * (abs(whole) * d + n), d)

    frac = re.match(r"^(-?\d+)\s*/\s*(-?\d+)$", s)
    if frac:
        return Fraction(int(frac.group(1)), int(frac.group(2)))

    if re.match(r"^-?\d+$", s):
        return Fraction(int(s), 1)

    if re.match(r"^-?\d+\.\d+$", s):
        return Fraction(s)

    simple = re.match(
        r"^(-?\d+(?:/\d+)?)\s*([+\-*/])\s*(-?\d+(?:/\d+)?)$", s
    )
    if simple:
        left = parse_math_value(simple.group(1))
        right = parse_math_value(simple.group(3))
        op = simple.group(2)
        if left is not None and right is not None:
            if op == "+":
                return left + right
            if op == "-":
                return left - right
            if op == "*":
                return left * right
            if op == "/":
                if right == 0:
                    return None
                return left / right

    return None


def extract_student_answers(student_text: str) -> List[str]:
    s = student_text or ""
    candidates: List[str] = []

    for m in re.finditer(
        r"\b(?:answer|equals?|is|=)\s*(?:is\s+)?(-?\d+\s+\d+/\d+|-?\d+/\d+|-?\d+\.\d+|-?\d+%?)\b",
        s,
        re.I,
    ):
        candidates.append(m.group(1))

    for m in re.finditer(r"-?\d+\s+\d+/\d+|-?\d+/\d+|-?\d+\.\d+|-?\d+%", s):
        candidates.append(m.group(0))

    if len(s.strip()) < 40:
        for m in re.finditer(r"(?:^|[^\d])(-?\d+)(?:[^\d]|$)", s):
            candidates.append(m.group(1))

    seen = set()
    out: List[str] = []
    for c in candidates:
        key = c.strip()
        if not key or key in seen:
            continue
        if parse_math_value(key) is None:
            continue
        seen.add(key)
        out.append(key)
    return out


def _close_partial(a: Fraction, b: Fraction) -> bool:
    if b == 0:
        return abs(float(a)) < 1e-6
    ratio = float(a) / float(b)
    if abs(ratio - 1) < 0.12:
        return True
    if abs(ratio) > 0.5 and abs(ratio - 1 / ratio) < 0.05:
        return True
    return False


def verify_math_answer(
    student_text: str,
    *,
    expected: str | None = None,
    alts: List[str] | None = None,
    tutor_text: str = "",
    tutor_claimed: str | None = None,
) -> Dict[str, Any]:
    tag = parse_check_tags(tutor_text)
    expected_raw = expected or tag.get("expected")
    alt_list = list(alts or []) + list(tag.get("alts") or [])
    claimed = tutor_claimed or tag.get("result")

    base = {
        "checked": False,
        "correctness": None,
        "confidence": 0.0,
        "method": "none",
        "studentRaw": None,
        "expectedRaw": expected_raw,
        "expectedAlts": alt_list,
        "tutorClaimed": claimed,
        "discrepancy": False,
    }

    if not expected_raw and not alt_list:
        return {**base, "note": "no_expected"}

    candidates = extract_student_answers(student_text)
    if not candidates:
        return {**base, "note": "no_student_math"}

    expected_vals: List[Tuple[str, Fraction]] = []
    for e in [expected_raw, *alt_list]:
        if not e:
            continue
        v = parse_math_value(e)
        if v is not None:
            expected_vals.append((e, v))
    if not expected_vals:
        return {**base, "note": "unparseable_expected"}

    ordered = list(reversed(candidates))
    best: Optional[Dict[str, Any]] = None

    for cand in ordered:
        sv = parse_math_value(cand)
        if sv is None:
            continue
        for exp_raw, exp_v in expected_vals:
            if sv == exp_v:
                best = {
                    "checked": True,
                    "correctness": "correct",
                    "confidence": 0.95,
                    "method": "rational_equiv",
                    "studentRaw": cand,
                    "expectedRaw": exp_raw,
                    "expectedAlts": alt_list,
                    "tutorClaimed": claimed,
                    "discrepancy": False,
                }
                break
        if best:
            break

    if not best:
        last = ordered[0]
        sv = parse_math_value(last)
        partial = False
        if sv is not None:
            for exp_raw, exp_v in expected_vals:
                if _close_partial(sv, exp_v):
                    best = {
                        "checked": True,
                        "correctness": "partial",
                        "confidence": 0.7,
                        "method": "near_miss",
                        "studentRaw": last,
                        "expectedRaw": exp_raw,
                        "expectedAlts": alt_list,
                        "tutorClaimed": claimed,
                        "discrepancy": False,
                    }
                    partial = True
                    break
        if not partial:
            best = {
                "checked": True,
                "correctness": "incorrect",
                "confidence": 0.88,
                "method": "mismatch",
                "studentRaw": last,
                "expectedRaw": expected_vals[0][0],
                "expectedAlts": alt_list,
                "tutorClaimed": claimed,
                "discrepancy": False,
            }

    if (
        claimed
        and best
        and best.get("correctness")
        and claimed != best["correctness"]
    ):
        if (claimed == "correct" and best["correctness"] == "incorrect") or (
            claimed == "incorrect" and best["correctness"] == "correct"
        ):
            best["discrepancy"] = True
            best["note"] = "tutor_disagreement"
            best["confidence"] = min(0.99, float(best["confidence"]) + 0.02)

    return best or base


def resolve_graded_correctness(
    linguistic: str,
    verification: Optional[Dict[str, Any]],
    *,
    prefer_checker: bool = True,
) -> Dict[str, Any]:
    if (
        prefer_checker
        and verification
        and verification.get("checked")
        and verification.get("correctness")
        and float(verification.get("confidence") or 0) >= 0.65
    ):
        return {
            "correctness": verification["correctness"],
            "source": "math_verifier",
            "verification": verification,
            "linguistic": linguistic,
        }
    return {
        "correctness": linguistic,
        "source": "linguistic",
        "verification": verification,
        "linguistic": linguistic,
    }


def is_math_pilot_context(subject: str = "", topic: str = "") -> bool:
    blob = f"{subject} {topic}".lower()
    keys = ("math", "fraction", "algebra", "equation", "number", "arithmetic")
    return any(k in blob for k in keys)
