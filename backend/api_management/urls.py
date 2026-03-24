from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmployeeListView, EmployeeDropdownView, SignupView, SyncAllUsersView, 
    UserListView, AccessKeyViewSet, DashboardStatsView, ApiKeyUpdateView, 
    DynamicEndpointViewSet, DynamicIngestionView, GeoHierarchyView, 
    SyncUsersPageView, SystemErrorLogView, ExternalNotificationLogView, 
    FrontendErrorLoggingView, RetryNotificationView
)

router = DefaultRouter()
router.register(r'access-keys', AccessKeyViewSet)
router.register(r'dynamic-endpoints', DynamicEndpointViewSet)

urlpatterns = [
    path('employees/', EmployeeListView.as_view(), name='employee-list'),
    path('employees/dropdown/', EmployeeDropdownView.as_view(), name='employee-dropdown'),
    path('signup/', SignupView.as_view(), name='signup'),
    path('sync-users/', SyncAllUsersView.as_view(), name='sync-users'),
    path('sync-users-page/', SyncUsersPageView.as_view(), name='sync-users-page'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('apikey/', ApiKeyUpdateView.as_view(), name='update-api-key'),
    path('connect/<str:endpoint_path>/', DynamicIngestionView.as_view(), name='dynamic-ingest'),
    path('geo/hierarchy/', GeoHierarchyView.as_view(), name='geo-hierarchy'),
    
    # System Logs & Error Tracking
    path('system-logs/errors/', SystemErrorLogView.as_view(), name='system-error-logs'),
    path('system-logs/notifications/', ExternalNotificationLogView.as_view(), name='notification-logs'),
    path('system-logs/notifications/<int:log_id>/retry/', RetryNotificationView.as_view(), name='retry-notification'),
    path('system-logs/report-frontend/', FrontendErrorLoggingView.as_view(), name='report-frontend-error'),
    
    path('', include(router.urls)),
]
