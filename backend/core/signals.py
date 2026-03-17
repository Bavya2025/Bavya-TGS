# from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from .models import LoginHistory, AuditLog
from django.db.models.signals import post_migrate
from django.core.management import call_command

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


# Signal handlers for Django auth removed as they are not used in custom auth system


@receiver(post_migrate)
def create_default_superuser(sender, **kwargs):
    """Automatically creates default superuser after migrations."""
    if sender.name == 'core':
        try:
            call_command('create_admin')
        except Exception as e:
            print(f"Error creating default superuser: {e}")
