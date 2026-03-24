import time
import traceback
import json
import uuid
from django.utils.deprecation import MiddlewareMixin
from .models import APILog, SystemErrorLog

class APILoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log all API requests and their performance.
    """
    def process_request(self, request):
        request.start_time = time.time()

    def process_response(self, request, response):
        if hasattr(request, 'start_time'):
            # Calculate Latency
            duration = (time.time() - request.start_time) * 1000
            
            # Identify User or Source
            user = getattr(request, 'custom_user', None)
            source = user.employee_id if user else "Anonymous"

            # Log to DB (excluding very noisy paths if needed)
            # if not any(request.path.startswith(p) for p in ['/api/health', '/api/notifications']):
            try:
                APILog.objects.create(
                    source=source,
                    endpoint=request.path,
                    method=request.method,
                    status_code=response.status_code,
                    latency_ms=duration
                )
            except:
                pass

        return response

class GlobalExceptionMiddleware(MiddlewareMixin):
    """
    Middleware to catch all unhandled exceptions and log them to the database.
    """
    def process_exception(self, request, exception):
        try:
            user = getattr(request, 'custom_user', None)
            if not user and request.user.is_authenticated:
                user = request.user

            SystemErrorLog.objects.create(
                level='ERROR',
                source='BACKEND',
                message=str(exception),
                traceback=traceback.format_exc(),
                path=request.path,
                user=user if hasattr(user, 'id') else None
            )
        except Exception as e:
            # Fallback to console if logging fails
            print(f"CRITICAL: Failed to log system error: {e}")
            print(traceback.format_exc())
        
        return None # Let Django handle the response and generate the 500
