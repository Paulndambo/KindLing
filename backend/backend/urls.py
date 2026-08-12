"""
URL configuration for Kindling backend API.
"""

from django.contrib import admin
from django.db import connection
from django.urls import include, path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET", "HEAD"])
@permission_classes([AllowAny])
def health(request):
    """Liveness/readiness probe for load balancers and local tooling."""
    db_ok = True
    try:
        connection.ensure_connection()
    except Exception:
        db_ok = False

    payload = {
        "status": "ok" if db_ok else "degraded",
        "service": "kindling-api",
        "database": "ok" if db_ok else "unavailable",
    }
    return Response(payload, status=200 if db_ok else 503)


urlpatterns = [
    path("health/", health, name="health"),
    path("api/health/", health, name="api-health"),
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/students/", include("students.urls")),
    path("api/subjects/", include("curriculum.urls")),
    path("api/learning/", include("learning.urls")),
    # Convenience alias used by frontend VITE_LEARNING_API_URL
    path("api/v1/learning/", include("learning.urls")),
]
