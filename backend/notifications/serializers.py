from rest_framework import serializers
from .models import Notification, Reminder, PushSubscription
from core.models import User

class NotificationSerializer(serializers.ModelSerializer):
    time_ago = serializers.SerializerMethodField()
    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), 
        required=False,
        allow_null=True
    )

    class Meta:
        model = Notification
        fields = ['id', 'user', 'title', 'message', 'type', 'unread', 'link', 'created_at', 'time_ago']

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

class ReminderSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())
    
    class Meta:
        model = Reminder
        fields = ['id', 'user', 'trip', 'category', 'title', 'message', 'remind_at', 'is_sent', 'acknowledged', 'created_at']

class PushSubscriptionSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = PushSubscription
        fields = ['id', 'user', 'endpoint', 'p256dh', 'auth', 'browser', 'device_type', 'created_at']
