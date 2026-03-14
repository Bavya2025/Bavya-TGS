from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, ReminderViewSet, PushSubscriptionViewSet

app_name = 'notifications'

router = DefaultRouter()
router.register(r'reminders', ReminderViewSet, basename='reminder')
router.register(r'push', PushSubscriptionViewSet, basename='push-subscription')
router.register(r'', NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
]
