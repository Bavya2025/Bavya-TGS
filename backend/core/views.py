import jwt
import datetime
import hashlib
from django.conf import settings
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework import status, generics, viewsets
from rest_framework.permissions import AllowAny

from .models import User, Session, LoginHistory, AuditLog, Notification
from .permissions import IsCustomAuthenticated, IsAdmin
from .serializers import NotificationSerializer, AuditLogSerializer, LoginHistorySerializer
from django.db.models import Q
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    try:
        data = request.data
        employee_id = data.get('employee_id')
        password = data.get('password')
        
        if not employee_id or not password:
            return Response({'error': 'Employee ID and Password are required'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.filter(employee_id__iexact=employee_id, is_active=True).first()
        if not user:
             return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
             
        hashed_input = hash_password(password)
        if user.password_hash != hashed_input:
            AuditLog.objects.create(
                action='LOGIN_FAILED',
                model_name='User',
                object_repr=employee_id,
                ip_address=request.META.get('REMOTE_ADDR'),
                details={'reason': 'Invalid password'}
            )
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
            
        expiration = timezone.now() + datetime.timedelta(hours=8)
        payload = {
            'user_id': user.id,
            'role': user.role.name,
            'exp': expiration
        }
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
        
        ip = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
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
            device_type='Web',
            browser_type='Chrome',
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
                'name': user.name,
                'role': user.role.name,
                'department': user.department,
                'designation': user.designation,
                'office_level': user.office_level,
                'email': user.email
            }
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsCustomAuthenticated])
def me_view(request):
    user = request.custom_user
    return Response({
        'id': user.id,
        'employee_id': user.employee_id,
        'name': user.name,
        'role': user.role.name,
        'department': user.department,
        'designation': user.designation,
        'office_level': user.office_level
    })

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



class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.custom_user)

    def perform_create(self, serializer):
        # Allow specifying a target user via 'user' or 'target_user' ID
        user_id = self.request.data.get('user') or self.request.data.get('target_user')
        if user_id:
            serializer.save(user_id=user_id)
        else:
            serializer.save(user=self.request.custom_user)

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        user = request.custom_user
        Notification.objects.filter(user=user, unread=True).update(unread=False)
        return Response({'message': 'All notifications marked as read'})


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
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['user', 'ip_address']
    search_fields = ['user__employee_id', 'ip_address']
    ordering_fields = ['login_time', 'logout_time']
    ordering = ['-login_time']

    def get_queryset(self):
        user = self.request.custom_user
        role_name = (user.role.name if user.role else '').lower()
            
        if role_name in ['admin', 'cfo', 'hr', 'finance']:
             return LoginHistory.objects.all().select_related('user')
        return LoginHistory.objects.filter(user=user).select_related('user')

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all().select_related('user')
    serializer_class = AuditLogSerializer
    permission_classes = [IsCustomAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['user', 'action', 'model_name']
    search_fields = ['user__employee_id', 'object_repr', 'details']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']

    def get_queryset(self):
        user = self.request.custom_user
        role_name = (user.role.name if user.role else '').lower()
 
        if role_name in ['admin', 'cfo', 'finance']:
             return AuditLog.objects.exclude(action='PAGE_ACCESS').select_related('user')
        return AuditLog.objects.filter(user=user).exclude(action='PAGE_ACCESS').select_related('user')

