from rest_framework import serializers
from .models import User, Role, Session, Notification, AuditLog, LoginHistory

class UserSerializer(serializers.ModelSerializer):
    role = serializers.StringRelatedField()
    class Meta:
        model = User
        fields = ['id', 'name', 'employee_id', 'role', 'designation', 'department', 
                  'is_face_enrolled', 'face_photo', 'allow_photo_reset']

class SessionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = Session
        fields = ['id', 'user_name', 'user_email', 'ip_address', 'created_at', 'expires_at', 'logged_out_at', 'is_active']

class NotificationSerializer(serializers.ModelSerializer):
    time_ago = serializers.SerializerMethodField()
    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), 
        required=False,
        allow_null=True
    )

    class Meta:
        model = Notification
        fields = ['id', 'user', 'title', 'message', 'type', 'unread', 'created_at', 'time_ago']

    def get_time_ago(self, obj):
        from django.utils.timezone import now
        diff = now() - obj.created_at
        if diff.days > 0:
            return f"{diff.days}d ago"
        seconds = diff.seconds
        if seconds < 60:
            return "Just now"
        if seconds < 3600:
            return f"{seconds // 60}m ago"
        return f"{seconds // 3600}h ago"

class LoginHistorySerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.name')
    user_email = serializers.ReadOnlyField(source='user.email')
    activities = serializers.SerializerMethodField()

    class Meta:
        model = LoginHistory
        fields = ['id', 'user', 'user_name', 'user_email', 'login_time', 'logout_time', 'ip_address', 'user_agent', 'device_type', 'browser_type', 'status', 'failure_reason', 'activities']

    def get_activities(self, obj):
        from django.utils import timezone
        end_time = obj.logout_time or timezone.now()
        logs = AuditLog.objects.filter(
            user=obj.user, 
            timestamp__gte=obj.login_time,
            timestamp__lte=end_time
        ).order_by('timestamp')
        
        return AuditLogSerializer(logs, many=True).data

class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = ['id', 'user_name', 'action', 'model_name', 'object_repr', 'details', 'ip_address', 'timestamp']
