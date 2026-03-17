from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChatBotViewSet, SupportTicketViewSet

router = DefaultRouter()
router.register(r'chat', ChatBotViewSet, basename='chat')
router.register(r'tickets', SupportTicketViewSet, basename='tickets')

urlpatterns = [
    path('', include(router.urls)),
]
