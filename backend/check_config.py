import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

from api_management.models import SystemConfig, AccessKey
from api_management.utils import decrypt_key

print("--- SystemConfig ---")
for cfg in SystemConfig.objects.all():
    print(f"Key: {cfg.key}")
    if 'key' in cfg.key.lower():
        try:
            val = decrypt_key(cfg.value)
            print(f"Value: {val[:5]}... (decrypted)")
        except:
            print(f"Value: {cfg.value[:5]}... (encrypted/raw)")
    else:
        print(f"Value: {cfg.value}")

print("\n--- AccessKeys ---")
for key in AccessKey.objects.all():
    print(f"Name: {key.name}, Active: {key.is_active}")
    try:
        dec = decrypt_key(key.encrypted_key)
        print(f"Key: {dec[:5]}... (decrypted)")
    except:
        print(f"Key: (failed to decrypt)")
