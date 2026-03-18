import os
import django
import sys

# Add the current directory and backend directory to sys.path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'backend'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

from travel.models import Trip
from core.models import User

user = User.objects.filter(employee_id='HR-EMP-00006').first()
if user:
    print(f"User: {user.name} ({user.employee_id})")
    trips = Trip.objects.filter(user=user).order_by('-created_at')
    print(f"Total trips found: {trips.count()}")
    for t in trips:
        print(f"ID: {t.trip_id} | Status: {t.status} | Approver: {t.current_approver.name if t.current_approver else 'None'} | RM: {t.reporting_manager_name}")
else:
    print("User not found")
