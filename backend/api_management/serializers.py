from rest_framework import serializers
from .models import AccessKey, APILog, DynamicEndpoint, DynamicSubmission

class AccessKeySerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessKey
        fields = ['id', 'name', 'masked_key', 'created_at', 'is_active', 'rate_limit', 'expires_at', 'allowed_endpoints', 'permissions']
        read_only_fields = ['masked_key', 'created_at']

class AccessKeyListSerializer(serializers.ModelSerializer):
    key = serializers.CharField(source='masked_key', read_only=True)

    class Meta:
        model = AccessKey
        fields = ['id', 'name', 'key', 'created_at', 'is_active', 'rate_limit', 'expires_at', 'allowed_endpoints', 'permissions']

class APILogSerializer(serializers.ModelSerializer):
    class Meta:
        model = APILog
        fields = '__all__'

class DynamicEndpointSerializer(serializers.ModelSerializer):
    class Meta:
        model = DynamicEndpoint
        fields = ['id', 'name', 'url_path', 'description', 'created_at', 'is_active', 'response_type', 'response_config', 'script_type', 'script_content']
        read_only_fields = ['created_at']

class DynamicSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DynamicSubmission
        fields = ['id', 'endpoint', 'data', 'headers', 'received_at']
        read_only_fields = ['received_at']
