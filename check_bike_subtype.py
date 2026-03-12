import os
import django
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

from travel.models import LocalBikeSubTypeMaster

print("Checking LocalBikeSubTypeMaster data:")
for item in LocalBikeSubTypeMaster.objects.all():
    print(f"ID: {item.id}, SubType: '{item.sub_type}', Status: {item.status}")
