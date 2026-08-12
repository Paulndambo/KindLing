from django.contrib.auth import authenticate, get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from typing import Any, Dict

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
