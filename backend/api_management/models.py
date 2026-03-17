from django.db import models

class SystemConfig(models.Model):
    key = models.CharField(max_length=50, unique=True, default='external_api_key')
    value = models.TextField()
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.key}: {self.value}"

    class Meta:
        verbose_name = "System Configuration"
        verbose_name_plural = "System Configurations"

class APIKeyHistory(models.Model):
    encrypted_value = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"History from {self.created_at}"

    class Meta:
        verbose_name = "API Key History"
        verbose_name_plural = "API Key Histories"
        ordering = ['-created_at']

class AccessKey(models.Model):
    name = models.CharField(max_length=100, help_text="Name of the application using this key")
    masked_key = models.CharField(max_length=50, help_text="Masked key for display", default='')
    encrypted_key = models.TextField(help_text="Encrypted key for retrieval", default='')
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    rate_limit = models.IntegerField(default=60, help_text="Requests per minute")
    expires_at = models.DateTimeField(null=True, blank=True)
    allowed_endpoints = models.JSONField(default=list, blank=True, help_text="List of allowed URL patterns")
    permissions = models.JSONField(default=dict, blank=True, help_text="Method-level permissions e.g. {'dashboard': ['GET']}")

    def __str__(self):
        return f"{self.name} ({self.masked_key})"

    class Meta:
        verbose_name = "Internal Access Key"
        verbose_name_plural = "Internal Access Keys"
        ordering = ['-created_at']

class DynamicEndpoint(models.Model):
    name = models.CharField(max_length=100, help_text="Friendly name for the endpoint")
    url_path = models.CharField(max_length=100, unique=True, help_text="The path segment. Final URL will be /api/connect/<url_path>/")
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    RESPONSE_TYPES = [
        ('NONE', 'Ingestion Only (Receive Data)'),
        ('TRIP_LIST', 'Return: Trip List'),
        ('TRIP_STATS', 'Return: Trip Statistics'),
        ('CUSTOM_SCRIPT', 'Custom Script (Python/SQL)'),
    ]
    response_type = models.CharField(max_length=20, choices=RESPONSE_TYPES, default='NONE')
    response_config = models.JSONField(default=dict, blank=True, help_text="Configuration for response data (e.g. filters)")
    
    script_type = models.CharField(max_length=10, choices=[('PYTHON', 'Python'), ('SQL', 'SQL')], blank=True, null=True)
    script_content = models.TextField(blank=True, help_text="Python script or SQL query")

    def __str__(self):
        return f"{self.name} (/{self.url_path})"

class DynamicSubmission(models.Model):
    endpoint = models.ForeignKey(DynamicEndpoint, on_delete=models.CASCADE, related_name='submissions')
    data = models.JSONField(help_text="The JSON payload received")
    headers = models.JSONField(default=dict, blank=True)
    received_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Submission to {self.endpoint.url_path} at {self.received_at}"

    class Meta:
        verbose_name = "API Log"
        verbose_name_plural = "API Logs"
        ordering = ['-received_at']

class APILog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    source = models.CharField(max_length=100, blank=True, null=True, help_text="Application Name or User ID")
    endpoint = models.CharField(max_length=255)
    method = models.CharField(max_length=10)
    status_code = models.IntegerField()
    latency_ms = models.FloatField(help_text="Response time in milliseconds")

    def __str__(self):
        return f"{self.method} {self.endpoint} - {self.status_code}"

    class Meta:
        verbose_name = "API Log"
        verbose_name_plural = "API Logs"
        ordering = ['-timestamp']
