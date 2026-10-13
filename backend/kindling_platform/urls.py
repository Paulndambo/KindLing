from django.urls import path

from .views import (
    AiRoutingView,
    BillingInvoiceView,
    PlanCatalogView,
    PlatformGeminiView,
    SubscriptionView,
)

urlpatterns = [
    path("plans/", PlanCatalogView.as_view(), name="platform-plans"),
    path("subscription/", SubscriptionView.as_view(), name="platform-subscription"),
    path("invoices/", BillingInvoiceView.as_view(), name="platform-invoices"),
    path("ai-routing/", AiRoutingView.as_view(), name="platform-ai-routing"),
    path("ai/gemini/", PlatformGeminiView.as_view(), name="platform-gemini"),
]
