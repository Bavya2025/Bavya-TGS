import jwt
from django.conf import settings
from django.http import JsonResponse
from .models import Session, User
from django.utils import timezone

class CustomAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/api/auth/login') or request.path.startswith('/admin'):
            return self.get_response(request)

        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            request.custom_user = None
        else:
            token = auth_header.split(' ')[1]
            try:
                payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
                
                session = Session.objects.filter(token=token, is_active=True).first()
                
                if session and session.is_valid():
                    has_timed_out = False
                    if session.last_activity:
                        idle_duration = timezone.now() - session.last_activity
                        if idle_duration.total_seconds() > 900:
                            session.is_active = False
                            session.logged_out_at = timezone.now()
                            session.save()
                            has_timed_out = True
                    
                    if not has_timed_out:
                        session.last_activity = timezone.now()
                        session.save(update_fields=['last_activity'])
                        
                        request.custom_user = session.user
                        request.active_session = session
                    else:
                        request.custom_user = None
                        request.active_session = None
                else:
                    request.custom_user = None
                    request.active_session = None
            except jwt.ExpiredSignatureError:
                request.custom_user = None
            except (jwt.InvalidTokenError, Session.DoesNotExist):
                request.custom_user = None

        return self.get_response(request)



import threading
_thread_locals = threading.local()

def get_current_user():
    return getattr(_thread_locals, 'user', None)

def get_current_request():
    return getattr(_thread_locals, 'request', None)

class ThreadLocalMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_locals.user = getattr(request, 'user', None)
        if hasattr(request, 'custom_user') and request.custom_user:
             _thread_locals.user = request.custom_user
        _thread_locals.request = request
        
        response = self.get_response(request)
        
        if hasattr(_thread_locals, 'user'):
            del _thread_locals.user
        if hasattr(_thread_locals, 'request'):
            del _thread_locals.request
            
        return response
