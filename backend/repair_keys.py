import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

from api_management.models import AccessKey
from api_management.utils import encrypt_key

EXPECTED_KEY = 'MOBILE-APP-PROD-2025-V11'

key_obj, created = AccessKey.objects.get_or_create(
    name="Mobile Application",
    defaults={
        'is_active': True,
        'rate_limit': 1000,
        'permissions': {
            '*': ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
        }
    }
)

key_obj.encrypted_key = encrypt_key(EXPECTED_KEY)
key_obj.masked_key = f"{EXPECTED_KEY[:4]}****{EXPECTED_KEY[-4:]}"
key_obj.is_active = True
# Ensure broad permissions for now to fix the blockage
key_obj.permissions = {
    '*': ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}
key_obj.save()

print(f"Key {'created' if created else 'updated'} successfully.")
