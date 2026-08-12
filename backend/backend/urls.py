"""
URL configuration for Kindling backend API.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    # Health + telemetry (core observability)
    path("", include("core.urls")),
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/students/", include("students.urls")),
    path("api/subjects/", include("curriculum.urls")),
    path("api/learning/", include("learning.urls")),
    # Convenience alias used by frontend VITE_LEARNING_API_URL
    path("api/v1/learning/", include("learning.urls")),
]

# Dev media serving for homework images
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
