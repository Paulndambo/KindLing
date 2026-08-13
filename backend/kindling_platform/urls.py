from django.urls import path

from .views import AiRoutingView, PlanCatalogView, SubscriptionView

urlpatterns = [
    path("plans/", PlanCatalogView.as_view(), name="platform-plans"),
    path("subscription/", SubscriptionView.as_view(), name="platform-subscription"),
    path("ai-routing/", AiRoutingView.as_view(), name="platform-ai-routing"),
]
