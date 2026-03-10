
import os
import sys
import django

# Set PROJECT_ROOT to the directory containing manage.py
PROJECT_ROOT = r'c:\Users\User-1.DESKTOP-7I5UC2H\Downloads\TGS-V1 (3)\TGS-V1\backend'
sys.path.insert(0, PROJECT_ROOT)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

from core.models import User
from travel.models import BulkActivityBatch

print("--- USERS ---")
for u in User.objects.all():
    role_name = u.role.name if u.role else "None"
    rm_name = u.reporting_manager.username if u.reporting_manager else "None"
    print(f"ID={u.id} | username={u.username} | name={u.name} | role={role_name} | RM={rm_name}")

print("\n--- BATCHES ---")
for b in BulkActivityBatch.objects.all():
    user_name = b.user.username if b.user else "None"
    appr_name = b.current_approver.username if b.current_approver else "None"
    print(f"ID={b.id} | Submitter={user_name} | Approver={appr_name} | Status={b.status}")
