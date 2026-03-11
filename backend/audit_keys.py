import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

from api_management.models import AccessKey
from api_management.utils import decrypt_key

with open('key_audit.txt', 'w') as f:
    f.write("--- AccessKeys Audit ---\n")
    for key in AccessKey.objects.all():
        try:
            dec = decrypt_key(key.encrypted_key)
            f.write(f"Name: {key.name}, Masked: {key.masked_key}, Raw: {dec}, Active: {key.is_active}\n")
        except Exception as e:
            f.write(f"Name: {key.name}, Error: {str(e)}\n")
