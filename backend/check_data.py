
import os
import django
import sys

# Add the project directory to the sys.path
sys.path.append(r'c:\Users\User-1.DESKTOP-7I5UC2H\Downloads\TGS-V1 (3)\TGS-V1\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

from core.models import User
from travel.models import BulkActivityBatch

print("--- USERS ---")
for u in User.objects.all():
    role = u.role.name if u.role else 'No Role'
    rm = u.reporting_manager.username if u.reporting_manager else 'None'
    print(f"ID: {u.id} | User: {u.username} | Name: {u.name} | Role: {role} | Manager: {rm}")

print("\n--- BATCHES ---")
for b in BulkActivityBatch.objects.all():
    user = b.user.username if b.user else 'No User'
    appr = b.current_approver.username if b.current_approver else 'None'
    print(f"ID: {b.id} | Submitter: {user} | Approver: {appr} | Status: {b.status} | File: {b.file_name}")
