from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AccountDeleteView,
    DataExportView,
    DemoLoginView,
    LoginView,
    MeView,
    RegisterView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("demo/", DemoLoginView.as_view(), name="auth-demo"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("export/", DataExportView.as_view(), name="auth-export"),
    path("account/", AccountDeleteView.as_view(), name="auth-account-delete"),
]
