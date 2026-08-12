from rest_framework import serializers

from .models import ClientErrorReport, ProductMetric

# SafetyEvent imported only for choice documentation; validation is string-based


class ClientErrorReportSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(
        choices=ClientErrorReport.Kind.choices,
        default=ClientErrorReport.Kind.UNKNOWN,
        required=False,
    )
    message = serializers.CharField(required=False, allow_blank=True, max_length=500)
    code = serializers.CharField(required=False, allow_blank=True, max_length=64)
    component = serializers.CharField(required=False, allow_blank=True, max_length=80)
    path = serializers.CharField(required=False, allow_blank=True, max_length=200)
    sessionId = serializers.CharField(
        required=False, allow_blank=True, max_length=64, source="session_id"
    )
    clientTs = serializers.DateTimeField(
        required=False, allow_null=True, source="client_ts"
    )
    extra = serializers.DictField(required=False, child=serializers.JSONField())


class ClientErrorBatchSerializer(serializers.Serializer):
    errors = ClientErrorReportSerializer(many=True, allow_empty=False)

    def validate_errors(self, value):
        if len(value) > 50:
            raise serializers.ValidationError("At most 50 errors per batch.")
        return value


class ProductMetricSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=80)
    value = serializers.FloatField(required=False, default=1.0)
    sessionId = serializers.CharField(
        required=False, allow_blank=True, max_length=64, source="session_id"
    )
    clientTs = serializers.DateTimeField(
        required=False, allow_null=True, source="client_ts"
    )
    tags = serializers.DictField(required=False, child=serializers.JSONField())

    def validate_name(self, value: str) -> str:
        cleaned = value.strip().lower().replace(" ", "_")
        if not cleaned or len(cleaned) > 80:
            raise serializers.ValidationError("Invalid metric name.")
        # Allow dotted funnel names: session.first_message
        allowed = set("abcdefghijklmnopqrstuvwxyz0123456789._-")
        if any(c not in allowed for c in cleaned):
            raise serializers.ValidationError(
                "Metric name may only contain a-z, 0-9, ., _, -"
            )
        return cleaned


class ProductMetricBatchSerializer(serializers.Serializer):
    metrics = ProductMetricSerializer(many=True, allow_empty=False)

    def validate_metrics(self, value):
        if len(value) > 100:
            raise serializers.ValidationError("At most 100 metrics per batch.")
        return value


class SafetyEventSerializer(serializers.Serializer):
    category = serializers.CharField(max_length=40)
    code = serializers.CharField(required=False, allow_blank=True, max_length=64)
    severity = serializers.ChoiceField(
        choices=["low", "high", "info"],
        default="high",
        required=False,
    )
    sessionId = serializers.CharField(
        required=False, allow_blank=True, max_length=64, source="session_id"
    )
    ageBand = serializers.CharField(
        required=False, allow_blank=True, max_length=20, source="age_band"
    )
    component = serializers.CharField(required=False, allow_blank=True, max_length=80)
    clientTs = serializers.DateTimeField(
        required=False, allow_null=True, source="client_ts"
    )
    extra = serializers.DictField(required=False, child=serializers.JSONField())

    def validate_category(self, value: str) -> str:
        cleaned = sanitize_category(value)
        if not cleaned:
            raise serializers.ValidationError("Invalid category.")
        return cleaned


def sanitize_category(value: str) -> str:
    text = (value or "").strip().lower().replace(" ", "_")
    allowed = set("abcdefghijklmnopqrstuvwxyz0123456789_-")
    if not text or any(c not in allowed for c in text):
        return ""
    return text[:40]
