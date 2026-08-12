from django.contrib.auth import authenticate, get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from typing import Any, Dict

from .privacy import build_user_export, delete_user_account
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer

User = get_user_model()

DEMO_EMAIL = "student@kindling.edu"
DEMO_PASSWORD = "kindling-demo"


def tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


def auth_payload(user) -> Dict[str, Any]:
    return {
        "user": UserSerializer(user).data,
        "tokens": tokens_for_user(user),
    }


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(auth_payload(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()
        password = serializer.validated_data["password"]

        # Authenticate by email (username is set to email on register)
        user = authenticate(request, username=email, password=password)
        if user is None:
            # Fallback: look up by email in case username differs
            try:
                candidate = User.objects.get(email__iexact=email)
                user = authenticate(
                    request, username=candidate.username, password=password
                )
            except User.DoesNotExist:
                user = None

        if user is None:
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(auth_payload(user))


class DemoLoginView(APIView):
    """One-click demo login matching the frontend AuthModal demo account."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user, created = User.objects.get_or_create(
            username=DEMO_EMAIL,
            defaults={
                "email": DEMO_EMAIL,
                "first_name": "Maya",
            },
        )
        if created:
            user.set_password(DEMO_PASSWORD)
            user.save(update_fields=["password"])

        return Response(auth_payload(user))


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class DataExportView(APIView):
    """
    GET /api/auth/export/

    GDPR-style export of account + learning data for the authenticated user.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(build_user_export(request.user))


class AccountDeleteView(APIView):
    """
    DELETE /api/auth/account/

    Permanently delete the authenticated account and cascaded student data.
    Body optional: { "confirm": true }
    """

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        confirm = request.data.get("confirm")
        if confirm is not True and str(confirm).lower() not in ("true", "1", "yes"):
            return Response(
                {
                    "detail": "Send JSON body {\"confirm\": true} to permanently delete this account."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            result = delete_user_account(request.user)
        except PermissionError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(result, status=status.HTTP_200_OK)
