import jwt
import datetime
import hashlib
import base64
from django.conf import settings
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework import status, generics, viewsets
from rest_framework.permissions import AllowAny

from .models import User, Session, LoginHistory, AuditLog, FaceRegistrationRequest, AttendanceFRS, PhotoUpdateRequest
from notifications.models import Notification
from .permissions import IsCustomAuthenticated, IsAdmin
from .serializers import AuditLogSerializer, LoginHistorySerializer, UserSerializer
from .pagination import StandardResultsSetPagination
from django.db.models import Q
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend
from .frs_util import get_face_encoding_from_image, compare_faces, base64_to_file

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    try:
        data = request.data
        employee_id = (data.get('employee_id') or '').strip()
        password = data.get('password')
        
        # Strict case-sensitive lookup
        employee_id = (data.get('employee_id') or '').strip()
        user = User.objects.filter(employee_id=employee_id).first()
        
        # Verify exact case match (handles case-insensitive DB collations)
        if user and user.employee_id != employee_id:
            user = None

        if not user:
             return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        
        if not user.is_active:
             return Response({'error': 'Your account is currently inactive. Please contact support.'}, status=status.HTTP_401_UNAUTHORIZED)
             
        hashed_input = hash_password(password)
        if user.password_hash != hashed_input:
            try:
                AuditLog.objects.create(
                    action='LOGIN_FAILED',
                    model_name='User',
                    object_repr=employee_id,
                    ip_address=request.META.get('REMOTE_ADDR'),
                    details={'reason': 'Invalid password'}
                )
            except: pass # Don't let audit logging crash the login failure response
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
            
        expiration = timezone.now() + datetime.timedelta(hours=8)
        payload = {
            'user_id': user.id,
            'role': user.role.name if user.role else 'Employee',
            'exp': expiration
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        
        ip = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        device_id = data.get('device_id')
        device_type = data.get('device_type', 'Web')
        
        if device_id:
            user.device_id = device_id
            user.save(update_fields=['device_id'])
        
        Session.objects.create(
            user=user,
            token=token,
            ip_address=ip,
            user_agent=user_agent,
            expires_at=expiration
        )
        
        # Create LoginHistory entry
        LoginHistory.objects.create(
            user=user, 
            ip_address=ip, 
            user_agent=user_agent,
            device_type=device_type,
            browser_type=data.get('browser_type', 'Chrome'),
            status='Success',
            failure_reason=''
        )
        
        # Create AuditLog entry
        AuditLog.objects.create(
            user=user,
            action='LOGIN',
            model_name='User',
            object_id=str(user.id),
            object_repr=str(user),
            ip_address=ip,
            details={'agent': user_agent, 'method': 'API'}
        )
        
        return Response({
            'token': token,
            'user': {
                'id': user.id,
                'employee_id': user.employee_id,
                'name': getattr(user, 'name', user.employee_id),
                'role': user.role.name if user.role else 'Employee',
                'department': getattr(user, 'department', 'N/A'),
                'designation': getattr(user, 'designation', 'N/A'),
                'office_level': getattr(user, 'office_level', 3),
                'email': getattr(user, 'email', ''),
                'theme': getattr(user, 'theme', 'classic'),
                'has_setup_security': hasattr(user, 'security_answers')
            }
        })
        
    except Exception as e:
        import traceback
        print(f"DEBUG: Login Error: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': 'Authentication server error. Please retry later or contact IT.'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['GET'])
@permission_classes([IsCustomAuthenticated])
def me_view(request):
    try:
        user = request.custom_user
        return Response({
            'id': user.id,
            'employee_id': user.employee_id,
            'name': getattr(user, 'name', user.employee_id),
            'role': user.role.name if user.role else 'Employee',
            'department': getattr(user, 'department', 'N/A'),
            'designation': getattr(user, 'designation', 'N/A'),
            'office_level': getattr(user, 'office_level', 3),
            'email': getattr(user, 'email', ''),
            'theme': getattr(user, 'theme', 'classic'),
            'has_setup_security': hasattr(user, 'security_answers')
        })
    except Exception as e:
        import traceback
        print(f"DEBUG: MeView Error: {str(e)}")
        print(traceback.format_exc())
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def logout_view(request):
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
        session = Session.objects.filter(token=token).first()
        if session:
            user = session.user
            session.is_active = False
            session.logged_out_at = timezone.now()
            session.save()
            
            # Update LoginHistory
            # Find the active login history for this user (most recent without logout time)
            # Ideally we'd link via session key, but for now assuming strict time ordering
            last_login = LoginHistory.objects.filter(user=user, logout_time__isnull=True).order_by('-login_time').first()
            if last_login:
                last_login.logout_time = timezone.now()
                last_login.save()
                
            # Create AuditLog
            AuditLog.objects.create(
                user=user,
                action='LOGOUT',
                model_name='User',
                object_id=str(user.id),
                object_repr=str(user),
                ip_address=session.ip_address,
                details={'method': 'API'}
            )
            
            return Response({'message': 'Logged out successfully'})

    return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)



@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({'status': 'ok', 'message': 'Backend is running correctly.'})




class LoginHistoryView(generics.ListAPIView):
    serializer_class = None # We will use a custom simple serializer or just values
    permission_classes = [IsAdmin]

    def get(self, request):
        # We can use the Session model to show login history
        # Filter by search if provided
        search = request.query_params.get('search', '').lower()
        
        sessions = Session.objects.select_related('user').all().order_by('-created_at')
        
        if search:
            from django.db.models import Q
            sessions = sessions.filter(
                Q(user__employee_id__istartswith=search) |
                Q(ip_address__istartswith=search)
            )

        data = []
        for s in sessions:
            data.append({
                'id': s.id,
                'user_name': s.user.name,
                'user_email': s.user.email,
                'ip_address': s.ip_address,
                'login_time': s.created_at,
                'logout_time': s.logged_out_at,
                'is_active': s.is_active
            })
            
        return Response(data)

class AuditLogView(generics.ListAPIView):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        queryset = AuditLog.objects.exclude(action='PAGE_ACCESS').order_by('-timestamp')
        search = self.request.query_params.get('search', None)
        model_name = self.request.query_params.get('model_name', None)
        action = self.request.query_params.get('action', None)
        
        if search:
            queryset = queryset.filter(
                Q(user__employee_id__istartswith=search) |
                Q(object_repr__istartswith=search) |
                Q(details__istartswith=search)
            )
        if model_name:
            queryset = queryset.filter(model_name__iexact=model_name)
        if action:
            queryset = queryset.filter(action__iexact=action)

            
class LoginHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LoginHistory.objects.all().select_related('user')
    serializer_class = LoginHistorySerializer
    permission_classes = [IsCustomAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['user', 'ip_address']
    search_fields = ['user__employee_id', 'ip_address', 'user__name']
    ordering_fields = ['login_time', 'logout_time']
    ordering = ['-login_time']

    def get_queryset(self):
        user = self.request.custom_user
        if not user or not user.role:
            return LoginHistory.objects.none()
            
        role_name = user.role.name.lower()
        # Fix: catch all admin variants and privileged roles
        privileged_keywords = ['admin', 'superuser', 'it admin', 'it-admin', 'cfo', 'hr', 'finance']
        is_privileged = any(kw in role_name for kw in privileged_keywords)
        
        queryset = LoginHistory.objects.all().select_related('user')
        if not is_privileged:
            queryset = queryset.filter(user=user)

        # Date filtering
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(login_time__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(login_time__date__lte=end_date)
            
        return queryset

    @action(detail=True, methods=['get'])
    def activities(self, request, pk=None):
        login_history = self.get_object()
        from django.utils import timezone
        end_time = login_history.logout_time or timezone.now()
        
        activities = AuditLog.objects.filter(
            user=login_history.user,
            timestamp__gte=login_history.login_time,
            timestamp__lte=end_time
        ).exclude(action='PAGE_ACCESS').order_by('timestamp')
        
        serializer = AuditLogSerializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        import csv
        from django.http import HttpResponse
        
        queryset = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="login_history.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['User', 'Email', 'IP Address', 'Browser', 'Device', 'Login Time', 'Logout Time', 'Status'])
        
        for log in queryset:
            writer.writerow([
                log.user.name,
                log.user.email,
                log.ip_address,
                log.browser_type,
                log.device_type,
                log.login_time,
                log.logout_time,
                log.status
            ])
        return response

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().select_related('user')
    serializer_class = AuditLogSerializer
    permission_classes = [IsCustomAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['user', 'action', 'model_name']
    search_fields = ['user__employee_id', 'user__name', 'object_repr', 'details']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']

    def get_queryset(self):
        user = self.request.custom_user
        if not user or not user.role:
            return AuditLog.objects.none()
            
        role_name = user.role.name.lower()
        # Fix: catch all admin variants and privileged roles
        privileged_keywords = ['admin', 'superuser', 'it admin', 'it-admin', 'cfo', 'hr', 'finance']
        is_privileged = any(kw in role_name for kw in privileged_keywords)

        queryset = AuditLog.objects.exclude(action='PAGE_ACCESS').select_related('user')
        if not is_privileged:
             queryset = queryset.filter(user=user)

        # Date filtering
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(timestamp__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__date__lte=end_date)

        return queryset

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        import csv
        from django.http import HttpResponse
        
        queryset = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="audit_logs.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Timestamp', 'User', 'Action', 'Model', 'Object ID', 'Object Repr', 'IP Address'])
        
        for log in queryset:
            writer.writerow([
                log.timestamp,
                log.user.name if log.user else 'System',
                log.action,
                log.model_name,
                log.object_id,
                log.object_repr,
                log.ip_address
            ])
        return response

@api_view(['POST'])
@permission_classes([IsCustomAuthenticated])
def enroll_face_view(request):
    user = request.custom_user
    
    # Check if user has a reporting manager
    if not user.reporting_manager:
        return Response({'error': 'No reporting manager assigned. Please contact HR or your manager.'}, status=status.HTTP_400_BAD_REQUEST)

    # Check for existing pending request
    existing_request = FaceRegistrationRequest.objects.filter(user=user, status='Pending').first()
    if existing_request:
        return Response({'error': 'You already have a pending registration request. Please wait for manager approval.'}, status=status.HTTP_400_BAD_REQUEST)

    face_image_base64 = request.data.get('face_image')
    if not face_image_base64:
        return Response({'error': 'No face image provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Convert base64 to file
    image_file = base64_to_file(face_image_base64, f"pending_face_{user.employee_id}.jpg")
    
    # Get encoding (validate that face exists)
    encoding_json = get_face_encoding_from_image(image_file)
    if not encoding_json:
        return Response({'error': 'No face detected in the image. Please try again with a clear photo.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Reset file pointer for DB save
    if hasattr(image_file, 'seek'):
        image_file.seek(0)
        
    # Create request instead of updating user directly
    FaceRegistrationRequest.objects.create(
        user=user,
        reporting_manager=user.reporting_manager,
        face_encoding=encoding_json,
        face_photo=image_file,
        status='Pending'
    )
    
    # Create notification for manager
    Notification.objects.create(
        user=user.reporting_manager,
        title="Face Registration Request",
        message=f"{user.name} (ID: {user.employee_id}) has submitted a face registration request for your approval.",
        type="info"
    )
    
    return Response({'message': 'Face registration submitted for approval to your reporting manager.'})

@api_view(['POST'])
@permission_classes([IsCustomAuthenticated])
def verify_face_view(request):
    user = request.custom_user
    if not user.is_face_enrolled:
        # Check if they have a pending request
        pending = FaceRegistrationRequest.objects.filter(user=user, status='Pending').first()
        if pending:
            return Response({'error': 'Your face registration is pending manager approval.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'error': 'Face not enrolled. Please register your face from Profile page.'}, status=status.HTTP_400_BAD_REQUEST)
    
    face_image_base64 = request.data.get('face_image')
    lat = request.data.get('latitude')
    lng = request.data.get('longitude')
    address = request.data.get('address')
    
    if not face_image_base64:
        return Response({'error': 'No face image provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Convert base64 to file
    image_file = base64_to_file(face_image_base64, f"attendance_{user.employee_id}_{timezone.now().timestamp()}.jpg")
    if not image_file:
        return Response({'error': 'Failed to process image data'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Compare faces
    try:
        is_match, distance, frs_error = compare_faces(user.face_encoding, image_file)
        if frs_error:
             return Response({'error': frs_error, 'match': False}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({'error': 'Error during face comparison'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Reset file pointer for DB save
    if hasattr(image_file, 'seek'):
        image_file.seek(0)
    
    # Create attendance record
    attendance = AttendanceFRS.objects.create(
        user=user,
        photo_captured=image_file,
        is_matched=is_match,
        match_score=1.0 - distance,
        latitude=lat,
        longitude=lng,
        location_address=address,
        status='Recorded'
    )
    
    # Notify Reporting Manager
    if user.reporting_manager:
        Notification.objects.create(
            user=user.reporting_manager,
            title="FRS Attendance Capture",
            message=f"{user.name} (ID: {user.employee_id}) captured attendance via FRS at {address or 'captured location'}.",
            type="info"
        )
        
    # Notify HR
    hr_users = User.objects.filter(role__name__icontains='hr')
    for hr in hr_users:
        if hr != user.reporting_manager: # Avoid duplicate notify if RM is also HR
            Notification.objects.create(
                user=hr,
                title="FRS Attendance Log",
                message=f"Attendance captured for {user.name} (ID: {user.employee_id}) via Biometric FRS.",
                type="info"
            )
    
    if is_match:
        return Response({'match': True, 'message': 'Face verification successful'})
    else:
        return Response({'match': False, 'message': 'Face Mismatch. Access Denied.'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([IsCustomAuthenticated])
def request_photo_update_view(request):
    user = request.custom_user
    reason = request.data.get('reason', '')
    
    if not reason:
         return Response({'error': 'Please provide a reason for update.'}, status=status.HTTP_400_BAD_REQUEST)
         
    PhotoUpdateRequest.objects.create(user=user, reason=reason)
    
    # Notify IT Admin or Senior Manager? For now just create request
    return Response({'message': 'Success! Your request has been sent for approval.'})

@api_view(['GET'])
@permission_classes([IsCustomAuthenticated])
def get_photo_update_requests_view(request):
    # Only Admin or reporting authorities can see
    user = request.custom_user
    role_name = (user.role.name if user.role else '').lower()
    
    if role_name not in ['it-admin', 'admin', 'reporting_authority']:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)
        
    requests = PhotoUpdateRequest.objects.filter(status='Pending').order_by('-created_at')
    
    data = []
    for r in requests:
        data.append({
            'id': r.id,
            'employee_name': r.user.name,
            'employee_id': r.user.employee_id,
            'reason': r.reason,
            'created_at': r.created_at
        })
    return Response(data)

@api_view(['POST'])
@permission_classes([IsCustomAuthenticated])
def handle_photo_update_request_view(request):
    manager = request.custom_user
    request_id = request.data.get('id')
    status_choice = request.data.get('status') # 'Approved' or 'Rejected'
    remarks = request.data.get('remarks', '')
    
    if not request_id or not status_choice:
         return Response({'error': 'Invalid data'}, status=status.HTTP_400_BAD_REQUEST)
         
    update_req = PhotoUpdateRequest.objects.filter(id=request_id).first()
    if update_req:
        update_req.status = status_choice
        update_req.approved_by = manager
        update_req.remarks = remarks
        update_req.save()
        
        if status_choice == 'Approved':
             user = update_req.user
             user.allow_photo_reset = True
             user.save()
             
             Notification.objects.create(
                 user=user,
                 title="Photo Update Approved",
                 message="Your request to update your FRS enrollment has been approved. You can now re-enroll.",
                 type="success"
             )
        
        return Response({'message': 'Request handled successfully'})

    return Response({'error': 'Request not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET'])
@permission_classes([IsCustomAuthenticated])
def profile_view(request):
    user = request.custom_user
    
    # 1. Start with local user record
    serializer = UserSerializer(user)
    data = serializer.data
    
    # 2. Add manager names from local relationships
    data['reporting_manager'] = user.reporting_manager.name if user.reporting_manager else None
    data['senior_manager'] = user.senior_manager.name if user.senior_manager else None
    data['hod_director'] = user.hod_director.name if user.hod_director else None
    
    # 3. Fetch detailed info from External API (filtered by ID for speed)
    from api_management.services import fetch_employee_data
    try:
        # We only need the specific employee, so it's super fast
        ext_data = fetch_employee_data(employee_id_filter=user.employee_id)
        if ext_data.get('results') and len(ext_data['results']) > 0:
            details = ext_data['results'][0]
            # Merge external details into response
            data['external_profile'] = details
            # Flatten common fields for easier UI access
            data['phone'] = details['employee'].get('phone')
            data['email'] = details['employee'].get('email') or data['email']
    except Exception as e:
        print(f"Failed to fetch external profile data: {e}")
        data['external_profile'] = None
        
    return Response(data)

@api_view(['GET'])
@permission_classes([IsCustomAuthenticated])
def get_face_registration_requests_view(request):
    manager = request.custom_user
    
    # Check if user is HR
    is_hr = 'hr' in manager.role.name.lower() or manager.role.name.lower() == 'hr' or manager.employee_id.lower().startswith('hr')
    
    if is_hr:
        # HR sees all pending registration requests
        requests = FaceRegistrationRequest.objects.filter(status='Pending')
    else:
        # Manager sees pending requests for their subordinates
        requests = FaceRegistrationRequest.objects.filter(reporting_manager=manager, status='Pending')
    
    data = []
    for r in requests:
        photo_url = None
        if r.face_photo:
            photo_url = request.build_absolute_uri(r.face_photo.url)
            
        data.append({
            'id': r.id,
            'employee_name': r.user.name,
            'employee_id': r.user.employee_id,
            'photo_url': photo_url,
            'created_at': r.created_at.isoformat(),
        })
    return Response(data)

@api_view(['POST'])
@permission_classes([IsCustomAuthenticated])
def handle_face_registration_request_view(request):
    manager = request.custom_user
    request_id = request.data.get('request_id')
    action = request.data.get('action') # 'approve' or 'reject'
    remarks = request.data.get('remarks', '')
    
    # Check if user is HR
    is_hr = 'hr' in manager.role.name.lower() or manager.role.name.lower() == 'hr' or manager.employee_id.lower().startswith('hr')
    
    if is_hr:
        reg_request = FaceRegistrationRequest.objects.filter(id=request_id, status='Pending').first()
    else:
        reg_request = FaceRegistrationRequest.objects.filter(id=request_id, reporting_manager=manager, status='Pending').first()
        
    if not reg_request:
        return Response({'error': 'Registration request not found or unauthorized.'}, status=status.HTTP_404_NOT_FOUND)
        
    if action == 'approve':
        reg_request.status = 'Approved'
        reg_request.remarks = remarks
        reg_request.save()
        
        # Update user with face data
        user = reg_request.user
        user.face_encoding = reg_request.face_encoding
        user.face_photo = reg_request.face_photo
        user.is_face_enrolled = True
        user.allow_photo_reset = False
        user.save()
        
        # Notify user
        Notification.objects.create(
            user=user,
            title="Face Registration Approved",
            message="Your face registration has been approved. You can now use FRS for attendance.",
            type="success"
        )
    else:
        reg_request.status = 'Rejected'
        reg_request.remarks = remarks
        reg_request.save()
        
        # Notify user
        Notification.objects.create(
            user=reg_request.user,
            title="Face Registration Rejected",
            message=f"Your face registration was rejected. Reason: {remarks}",
            type="error"
        )
        
    return Response({'message': f'Request {action}ed successfully.'})

@api_view(['GET'])
@permission_classes([IsCustomAuthenticated])
def get_pending_frs_approvals_view(request):
    manager = request.custom_user
    # Fetch all recently recorded attendance logs
    # We show 'Recorded' logs which replace the 'Pending' approval ones
    attendance_qs = AttendanceFRS.objects.filter(status='Recorded').select_related('user').order_by('-timestamp')
    
    data = []
    import pytz
    local_tz = pytz.timezone(settings.TIME_ZONE)
    
    for a in attendance_qs:
        # Check if user reports to this manager
        if a.user.reporting_manager != manager:
            # Check if this person IS HR (they can see all logs)
            is_hr = 'hr' in manager.role.name.lower() or manager.role.name.lower() == 'hr' or manager.employee_id.lower().startswith('hr')
            if not is_hr:
                continue
            
        photo_url = request.build_absolute_uri(a.photo_captured.url) if a.photo_captured else None
        
        # Format timestamp to local for better display
        local_dt = a.timestamp.astimezone(local_tz)
        
        data.append({
            'id': a.id,
            'employee_name': a.user.name,
            'employee_id': a.user.employee_id,
            'date': local_dt.strftime('%Y-%m-%d'),
            'time': local_dt.strftime('%H:%M'),
            'timestamp': local_dt.isoformat(),
            'photo_url': photo_url,
            'latitude': a.latitude,
            'longitude': a.longitude,
            'address': a.location_address,
            'match_score': a.match_score,
            'level': a.hierarchy_level
        })
    return Response(data)

@api_view(['POST'])
@permission_classes([IsCustomAuthenticated])
def handle_frs_approval_view(request):
    manager = request.custom_user
    attendance_id = request.data.get('attendance_id')
    action = request.data.get('action') # 'approve' or 'reject'
    remarks = request.data.get('remarks', '')
    
    attendance = AttendanceFRS.objects.filter(
        id=attendance_id,
        status='Pending'
    ).select_related('user').first()
    
    if not attendance or attendance.user.reporting_manager != manager:
        return Response({'error': 'Attendance record not found or unauthorized'}, status=status.HTTP_404_NOT_FOUND)
        
    attendance.status = 'Approved' if action == 'approve' else 'Rejected'
    attendance.remarks = remarks
    attendance.save()
    
    return Response({'message': f'Request {action}ed successfully'})

@api_view(['POST'])
@permission_classes([IsCustomAuthenticated])
def clear_frs_notifications_view(request):
    user = request.custom_user
    # Mark all FRS related notifications as read
    Notification.objects.filter(
        user=user, 
        title__in=["FRS Attendance Capture", "FRS Attendance Approval Request", "Face Registration Request", "Face Registration Approved", "Face Registration Rejected"]
    ).update(unread=False)
    
    # Update clear timestamp to hide logs from screen
    user.frs_logs_cleared_at = timezone.now()
    user.save()
    
    return Response({'message': 'FRS notifications cleared.'})


@api_view(['GET'])
@permission_classes([IsCustomAuthenticated])
def heartbeat_view(request):
    user = request.custom_user
    now = timezone.now()
    
    # 1. Notifications (Latest 10)
    notifications_qs = Notification.objects.filter(user=user).order_by('-created_at')[:10]
    unread_count = Notification.objects.filter(user=user, unread=True).count()
    
    # 2. Approval Counts
    from travel.models import Trip, TravelAdvance, TravelClaim
    user_role = (user.role.name.lower() if user.role else '')
    privileged_keywords = ['admin', 'superuser', 'it admin', 'it-admin', 'cfo', 'hr']
    is_privileged = any(kw in user_role for kw in privileged_keywords)
    is_finance = 'finance' in user_role
    
    trip_count = 0
    advance_count = 0
    claim_count = 0
    
    if is_privileged and not is_finance:
         trip_count = Trip.objects.filter(status__in=['Pending', 'Submitted', 'Forwarded']).count()
         advance_count = TravelAdvance.objects.filter(status__in=['Pending', 'Submitted', 'Forwarded']).count()
         claim_count = TravelClaim.objects.filter(status__in=['Pending', 'Submitted', 'Forwarded']).count()
    elif is_finance:
        if user.office_level == 1:
            advance_count = TravelAdvance.objects.filter(status='PENDING_HEAD').count()
            claim_count = TravelClaim.objects.filter(status='PENDING_HEAD').count()
        else:
            pending_money_statuses = ['PENDING_EXECUTIVE', 'HR Approved', 'REJECTED_BY_HEAD', 'PENDING_FINAL_RELEASE', 'Approved', 'Under Process']
            advance_count = TravelAdvance.objects.filter(status__in=pending_money_statuses).count()
            claim_count = TravelClaim.objects.filter(status__in=pending_money_statuses).count()
    else:
        trip_count = Trip.objects.filter(current_approver=user, status__in=['Pending', 'Submitted', 'Forwarded', 'Manager Approved']).count()
        advance_count = TravelAdvance.objects.filter(current_approver=user, status__in=['Pending', 'Submitted', 'Forwarded', 'Manager Approved']).count()
        claim_count = TravelClaim.objects.filter(current_approver=user, status__in=['Pending', 'Submitted', 'Forwarded', 'Manager Approved']).count()

    total_approvals = trip_count + advance_count + claim_count

    # 3. Reminders (look ahead 5 minutes for precision frontend triggering)
    from notifications.models import Reminder
    from datetime import timedelta
    future_buffer = now + timedelta(minutes=5)
    due_reminders = Reminder.objects.filter(user=user, remind_at__lte=future_buffer, acknowledged=False)
    
    reminder_data = []
    for r in due_reminders:
        reminder_data.append({
            'id': r.id,
            'title': r.title,
            'message': r.message,
            'remind_at': r.remind_at,
            'category': r.category,
            'trip': r.trip.trip_id if r.trip else None,
            'is_sent': r.is_sent
        })

    notif_data = []
    for n in notifications_qs:
        # Simple serialization
        notif_data.append({
            'id': n.id,
            'title': n.title,
            'message': n.message,
            'unread': n.unread,
            'created_at': n.created_at,
            'link': n.link
        })

    return Response({
        'notifications': notif_data,
        'unread_notification_count': unread_count,
        'approval_counts': {
            'total': total_approvals,
            'trips': trip_count,
            'advances': advance_count,
            'claims': claim_count
        },
        'due_reminders': reminder_data
    })
@api_view(['POST'])
@permission_classes([IsCustomAuthenticated])
def update_theme_view(request):
    user = request.custom_user
    theme = request.data.get('theme')
    
    if not theme:
        return Response({'error': 'Theme is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    valid_themes = ['classic', 'ocean', 'teal', 'sunset', 'midnight', 'minimal']
    if theme not in valid_themes:
        return Response({'error': 'Invalid theme'}, status=status.HTTP_400_BAD_REQUEST)
        
    user.theme = theme
    user.save()
    
    AuditLog.objects.create(
        user=user,
        action='THEME_UPDATE',
        model_name='User',
        object_id=str(user.id),
        object_repr=str(user),
        ip_address=request.META.get('REMOTE_ADDR'),
        details={'new_theme': theme}
    )
    
    return Response({'message': 'Theme updated successfully', 'theme': theme})

@api_view(['GET', 'POST'])
@permission_classes([IsCustomAuthenticated])
def setup_security_questions_view(request):
    user = request.custom_user
    from .models import UserSecurityAnswer
    
    if request.method == 'GET':
        has_setup = UserSecurityAnswer.objects.filter(user=user).exists()
        return Response({'has_setup': has_setup})
        
    if request.method == 'POST':
        answers = request.data.get('answers', [])
        if not answers or len(answers) != 5:
            return Response({'error': 'You must provide exactly 5 answers.'}, status=status.HTTP_400_BAD_REQUEST)
            
        for ans in answers:
            if len(str(ans).strip()) < 5:
                return Response({'error': 'Each answer must be at least 5 characters long.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Uniqueness check
        unique_answers = {str(ans).lower().strip() for ans in answers}
        if len(unique_answers) < 5:
            return Response({'error': 'All five security answers must be different.'}, status=status.HTTP_400_BAD_REQUEST)
            
        UserSecurityAnswer.objects.filter(user=user).delete() # Reset
        
        UserSecurityAnswer.objects.create(
            user=user,
            question_1_hash=hash_password(answers[0].lower().strip()),
            question_2_hash=hash_password(answers[1].lower().strip()),
            question_3_hash=hash_password(answers[2].lower().strip()),
            question_4_hash=hash_password(answers[3].lower().strip()),
            question_5_hash=hash_password(answers[4].lower().strip())
        )
        return Response({'message': 'Security questions saved successfully.'})

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_user_for_reset_view(request):
    employee_id = (request.data.get('employee_id') or '').strip()
    if not employee_id:
        return Response({'error': 'Employee ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
        
    user = User.objects.filter(employee_id__iexact=employee_id).first()
    if not user:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        
    if not user.is_active:
        return Response({'error': 'Your account is currently inactive.'}, status=status.HTTP_401_UNAUTHORIZED)
        
    # Rate limit check: max 3 resets per month
    month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    reset_count = AuditLog.objects.filter(
        user=user, 
        action='PASSWORD_RESET', 
        timestamp__gte=month_start
    ).count()
    
    if reset_count >= 3:
        return Response({
            'error': 'Security policy limit: You have already reset your password 3 times this month. Please contact HR or IT for further assistance.'
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
    from .models import UserSecurityAnswer
    has_setup = UserSecurityAnswer.objects.filter(user=user).exists()
    
    if not has_setup:
        return Response({
            'error': 'You have not set up your security questions. Would you like to set them up now to reset your password?',
            'code': 'NO_SECURITY_SETUP',
            'employee_id': user.employee_id
        }, status=status.HTTP_400_BAD_REQUEST)
        
    import random
    indices = random.sample(range(5), 2)
    
    return Response({
        'message': 'User verified',
        'employee_id': user.employee_id,
        'indices': indices
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_security_answers_view(request):
    employee_id = request.data.get('employee_id')
    # Use a dictionary mapping index to answer { "0": "answer1", "2": "answer2" }
    provided_answers = request.data.get('answers', {})
    
    if len(provided_answers) != 2:
        return Response({'error': 'You must provide exactly two answers.'}, status=status.HTTP_400_BAD_REQUEST)
        
    user = User.objects.filter(employee_id__iexact=employee_id).first()
    if not user:
        return Response({'error': 'Invalid user.'}, status=status.HTTP_400_BAD_REQUEST)
        
    from .models import UserSecurityAnswer
    sec_answer = UserSecurityAnswer.objects.filter(user=user).first()
    if not sec_answer:
        return Response({'error': 'No security questions setup found.'}, status=status.HTTP_400_BAD_REQUEST)
        
    # Mapping indices back to their respective fields
    hash_fields = [
        sec_answer.question_1_hash,
        sec_answer.question_2_hash,
        sec_answer.question_3_hash,
        sec_answer.question_4_hash,
        sec_answer.question_5_hash
    ]
    
    for idx_str, ans in provided_answers.items():
        try:
            idx = int(idx_str)
            if idx < 0 or idx > 4:
                return Response({'error': 'Invalid question index.'}, status=status.HTTP_400_BAD_REQUEST)
                
            ans_clean = ans.lower().strip()
            ans_hash = hash_password(ans_clean)
            if ans_hash != hash_fields[idx]:
                return Response({'error': 'One or more security answers are incorrect.'}, status=status.HTTP_401_UNAUTHORIZED)
        except ValueError:
             return Response({'error': 'Invalid question index mapping.'}, status=status.HTTP_400_BAD_REQUEST)
            
    # Success, generate a short-lived reset token
    expiration = timezone.now() + datetime.timedelta(minutes=15)
    payload = {
        'reset_user_id': user.id,
        'exp': expiration,
        'intent': 'password_reset'
    }
    reset_token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
    
    return Response({'reset_token': reset_token})

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_view(request):
    reset_token = request.data.get('reset_token')
    new_password = request.data.get('new_password')
    
    if not reset_token or not new_password:
        return Response({'error': 'Missing required fields.'}, status=status.HTTP_400_BAD_REQUEST)
        
    try:
        decoded = jwt.decode(reset_token, settings.SECRET_KEY, algorithms=['HS256'])
        if decoded.get('intent') != 'password_reset':
            return Response({'error': 'Invalid token intent.'}, status=status.HTTP_400_BAD_REQUEST)
            
        user_id = decoded.get('reset_user_id')
        user = User.objects.filter(id=user_id).first()
        
        if not user:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
            
        # Optional: Validate password complexity rules on backend too
        if len(new_password) < 8 or len(new_password) > 12:
            return Response({'error': 'Password must be between 8 and 12 characters.'}, status=status.HTTP_400_BAD_REQUEST)
            
        # Final rate limit check
        month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        reset_count = AuditLog.objects.filter(
            user=user, 
            action='PASSWORD_RESET', 
            timestamp__gte=month_start
        ).count()
        if reset_count >= 3:
            return Response({'error': 'Monthly reset limit reached.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
            
        user.password_hash = hash_password(new_password)
        user.save()
        
        # Invalidate all active sessions for security
        Session.objects.filter(user=user, is_active=True).update(is_active=False)
        
        AuditLog.objects.create(
            user=user,
            action='PASSWORD_RESET',
            model_name='User',
            object_repr=str(user),
            ip_address=request.META.get('REMOTE_ADDR'),
            details={'method': 'Security Questions'}
        )
        
        return Response({'message': 'Password has been successfully reset.'})
        
    except jwt.ExpiredSignatureError:
        return Response({'error': 'Reset session has expired. Please try again.'}, status=status.HTTP_401_UNAUTHORIZED)
    except jwt.InvalidTokenError:
        return Response({'error': 'Invalid reset session.'}, status=status.HTTP_401_UNAUTHORIZED)

@api_view(['POST'])
@permission_classes([AllowAny])
def submit_registration_request_view(request):
    data = request.data
    required_fields = ['employee_id', 'name', 'department', 'section', 'project', 'office', 'contact_number']
    
    for f in required_fields:
        if not data.get(f):
            return Response({'error': f'{f.replace("_", " ").title()} is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
    from .models import UserRegistrationRequest
    if UserRegistrationRequest.objects.filter(employee_id__iexact=data['employee_id'], status__in=['Pending', 'HR Approved']).exists():
        return Response({'error': 'A pending or approved request already exists for this Employee ID.'}, status=status.HTTP_400_BAD_REQUEST)
        
    UserRegistrationRequest.objects.create(
        employee_id=data['employee_id'],
        name=data['name'],
        department=data['department'],
        section=data['section'],
        project=data['project'],
        office=data['office'],
        contact_number=data['contact_number']
    )
    return Response({'message': 'Your registration request has been submitted. It will be sent to HR for approval, then to Admin for account creation.'})

@api_view(['GET', 'POST'])
def manage_registration_requests_view(request):
    user = request.custom_user
    role = user.role.name.lower()
    
    if 'hr' not in role and 'admin' not in role:
        return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
        
    from .models import UserRegistrationRequest
    if request.method == 'GET':
        # HR sees everything, Admin sees HR Approved or all
        reqs = UserRegistrationRequest.objects.all()
        return Response([{
            'id': r.id,
            'employee_id': r.employee_id,
            'name': r.name,
            'department': r.department,
            'section': r.section,
            'project': r.project,
            'office': r.office,
            'contact_number': r.contact_number,
            'status': r.status,
            'created_at': r.created_at,
            'remarks': r.remarks
        } for r in reqs])
        
    if request.method == 'POST':
        req_id = request.data.get('id')
        action = request.data.get('action') # 'approve', 'reject', 'created'
        remarks = request.data.get('remarks', '')
        
        try:
            req = UserRegistrationRequest.objects.get(id=req_id)
            if action == 'approve' and 'hr' in role:
                req.status = 'HR Approved'
                req.hr_approved_at = timezone.now()
            elif action == 'created' and 'admin' in role:
                if req.status != 'HR Approved':
                    return Response({'error': 'Request must be HR Approved first.'}, status=status.HTTP_400_BAD_REQUEST)
                req.status = 'Account Created'
                req.admin_approved_at = timezone.now()
            elif action == 'reject':
                req.status = 'Rejected'
            else:
                return Response({'error': 'Invalid action or insufficient permissions.'}, status=status.HTTP_400_BAD_REQUEST)
                
            req.remarks = remarks
            req.save()
            return Response({'message': f'Request status updated to {req.status}'})
        except UserRegistrationRequest.DoesNotExist:
            return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([AllowAny])
def setup_security_unauthenticated_view(request):
    employee_id = (request.data.get('employee_id') or '').strip()
    answers = request.data.get('answers', [])
    
    if not employee_id or len(answers) != 5:
        return Response({'error': 'Missing required fields.'}, status=status.HTTP_400_BAD_REQUEST)
        
    for ans in answers:
        if len(str(ans).strip()) < 5:
            return Response({'error': 'Each answer must be at least 5 characters long.'}, status=status.HTTP_400_BAD_REQUEST)
            
    # Uniqueness check
    unique_answers = {str(ans).lower().strip() for ans in answers}
    if len(unique_answers) < 5:
        return Response({'error': 'All five security answers must be different.'}, status=status.HTTP_400_BAD_REQUEST)
        
    user = User.objects.filter(employee_id__iexact=employee_id).first()
    if not user:
        return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        
    from .models import UserSecurityAnswer
    if UserSecurityAnswer.objects.filter(user=user).exists():
        return Response({'error': 'Security questions already set. Please verify them.'}, status=status.HTTP_400_BAD_REQUEST)
        
    # Setup for first time
    UserSecurityAnswer.objects.create(
        user=user,
        question_1_hash=hash_password(answers[0].lower().strip()),
        question_2_hash=hash_password(answers[1].lower().strip()),
        question_3_hash=hash_password(answers[2].lower().strip()),
        question_4_hash=hash_password(answers[3].lower().strip()),
        question_5_hash=hash_password(answers[4].lower().strip())
    )
    
    # Also generate a reset token since we verified user by this manual setting up
    expiration = timezone.now() + datetime.timedelta(minutes=15)
    payload = {
        'reset_user_id': user.id,
        'exp': expiration,
        'intent': 'password_reset'
    }
    reset_token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
    
    return Response({
        'message': 'Security questions set successfully. You can now reset your password.',
        'reset_token': reset_token
    })


