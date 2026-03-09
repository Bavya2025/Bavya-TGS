import time
import hashlib
from .models import APILog

class APILoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()
        
        response = self.get_response(request)

        if request.path.startswith('/api/') and 'X-API-KEY' in request.headers:
            latency = (time.time() - start_time) * 1000  # Convert to ms
            
            source = "External App" 
            
            if 'X-API-KEY' in request.headers:
                raw_key_in_header = request.headers.get('X-API-KEY')
                
                try:
                    from .models import AccessKey
                    from .utils import decrypt_key
                    
                    found_key = None
                    for db_key in AccessKey.objects.filter(is_active=True):
                        decrypted = decrypt_key(db_key.encrypted_key)
                        if decrypted == raw_key_in_header:
                            found_key = db_key
                            break
                    
                    if found_key:
                        source = found_key.name
                        
                        is_allowed = False
                        key_permissions = found_key.permissions or {}
                        
                        import fnmatch
                        from django.http import JsonResponse
                        
                        for path_pattern, allowed_methods in key_permissions.items():
                            if fnmatch.fnmatch(request.path, path_pattern):
                                if request.method in allowed_methods:
                                    is_allowed = True
                                    break
                        
                        if not is_allowed:
                            try:
                                APILog.objects.create(
                                    source=f"{source} (Blocked)",
                                    endpoint=request.path,
                                    method=request.method,
                                    status_code=403,
                                    latency_ms=(time.time() - start_time) * 1000
                                )
                            except: pass
                            
                            return JsonResponse(
                                {'error': 'Permission Denied: This API key is not authorized for this resource.'},
                                status=403
                            )
                            
                    else:
                        try:
                            APILog.objects.create(
                                source="Invalid Key (Blocked)",
                                endpoint=request.path,
                                method=request.method,
                                status_code=401,
                                latency_ms=(time.time() - start_time) * 1000
                            )
                        except: pass
                        
                        return JsonResponse(
                            {'error': 'Invalid or inactive API Key.'},
                            status=401
                        )

                except Exception as e:
                    print(f"Key Auth Error: {e}")
                    source = "Error"
            
            try:
                APILog.objects.create(
                    source=source,
                    endpoint=request.path,
                    method=request.method,
                    status_code=response.status_code,
                    latency_ms=latency
                )
            except Exception as e:
                print(f"Failed to log API request: {e}")

        return response
