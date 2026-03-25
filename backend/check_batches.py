import os
import django
import sys

# Add backend to path
sys.path.append(r'e:\TGS-V1.1\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from travel.models import BulkActivityBatch

latest_batches = BulkActivityBatch.objects.order_by('-created_at')[:5]
for b in latest_batches:
    print(f"ID: {b.id}, File: {b.file_name}, Data Size: {len(b.data_json) if isinstance(b.data_json, list) else 'N/A'}, Status: {b.status}, Created: {b.created_at}")
    if isinstance(b.data_json, list) and len(b.data_json) > 0:
        print(f"  Sample Data: {b.data_json[0]}")
    else:
        print(f"  Data: {b.data_json}")
