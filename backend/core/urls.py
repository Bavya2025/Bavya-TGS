from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import login_view, logout_view, me_view, NotificationViewSet, LoginHistoryViewSet, AuditLogViewSet

app_name = 'core'

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')


router.register(r'login-history', LoginHistoryViewSet, basename='login-history')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-logs')

urlpatterns = [
    path('auth/login', login_view, name='login'),
    path('auth/logout', logout_view, name='logout'),
    path('auth/me', me_view, name='me'),
    path('', include(router.urls)),
]
