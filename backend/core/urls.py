from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import login_view, logout_view, me_view, LoginHistoryViewSet, AuditLogViewSet, profile_view, AuditLogView, LoginHistoryView, enroll_face_view, verify_face_view, get_face_registration_requests_view, handle_face_registration_request_view, get_pending_frs_approvals_view, handle_frs_approval_view, clear_frs_notifications_view, request_photo_update_view, get_photo_update_requests_view, handle_photo_update_request_view, health_check, heartbeat_view, update_theme_view, setup_security_questions_view, verify_user_for_reset_view, verify_security_answers_view, reset_password_view, setup_security_unauthenticated_view, submit_registration_request_view, manage_registration_requests_view, unlock_user

app_name = 'core'

router = DefaultRouter()



router.register(r'login-history', LoginHistoryViewSet, basename='login-history')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-logs')

urlpatterns = [
    path('auth/login', login_view, name='login'),
    path('health', health_check, name='health-check'),
    path('heartbeat', heartbeat_view, name='heartbeat'),
    path('auth/logout', logout_view, name='logout'),
    path('auth/me', me_view, name='me'),
    path('auth/profile', profile_view, name='profile'),
    path('auth/update-theme', update_theme_view, name='update-theme'),
    path('auth/unlock-user', unlock_user, name='unlock-user'),
    path('audit-history', AuditLogView.as_view(), name='audit-history'),
    path('session-history', LoginHistoryView.as_view(), name='session-history'),
    

    # FRS Endpoints
    path('frs/enroll', enroll_face_view, name='frs-enroll'),
    path('frs/verify', verify_face_view, name='frs-verify'),
    path('frs/face-requests', get_face_registration_requests_view, name='get-face-requests'),
    path('frs/handle-face-request', handle_face_registration_request_view, name='handle-face-request'),
    path('frs/approvals', get_pending_frs_approvals_view, name='frs-approvals'),
    path('frs/handle-approval', handle_frs_approval_view, name='handle-approval'),
    path('frs/clear-notifications', clear_frs_notifications_view, name='frs-clear-notifications'),
    path('frs/request-update', request_photo_update_view, name='request-photo-update'),
    path('frs/update-requests', get_photo_update_requests_view, name='get-photo-update-requests'),
    path('frs/handle-request', handle_photo_update_request_view, name='handle-photo-update-request'),
    path('session-history', LoginHistoryView.as_view(), name='session-history'),
    
    path('auth/security-questions', setup_security_questions_view, name='security-questions'),
    path('auth/forgot-password/verify-user', verify_user_for_reset_view, name='verify-user-reset'),
    path('auth/forgot-password/verify-answers', verify_security_answers_view, name='verify-answers-reset'),
    path('auth/forgot-password/setup-manual', setup_security_unauthenticated_view, name='setup-manual-reset'),
    path('auth/forgot-password/reset', reset_password_view, name='reset-password'),
    path('auth/registration-request', submit_registration_request_view, name='submit-registration-request'),
    path('auth/manage-registrations', manage_registration_requests_view, name='manage-registrations'),
    path('', include(router.urls)),
]
