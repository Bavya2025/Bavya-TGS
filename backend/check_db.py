import os
import django
import sys

# Add the project directory to sys.path
sys.path.append('e:/TGS-V1.1/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

from travel.models import Trip
from core.models import User

# Check trip details
trip_id = 'IUYTRDSDFGHJK'
trip = Trip.objects.filter(trip_id=trip_id).first()

if trip:
    print(f"Trip ID: {trip.trip_id}")
    print(f"User: {trip.user.employee_id if trip.user else 'None'}")
    print(f"Status: {trip.status}")
    print(f"Current Approver: {trip.current_approver.employee_id if trip.current_approver else 'None'}")
    print(f"Reporting Manager Snapshot: {trip.reporting_manager_name}")
    print(f"Hierarchy Level: {trip.hierarchy_level}")
    
    # Check User's actual managers
    if trip.user:
        user = trip.user
        print(f"\nUser {user.employee_id} actual managers:")
        try:
            rm = user.reporting_manager
            print(f"Reporting Manager: {rm.employee_id if rm else 'None'}")
            sm = user.senior_manager
            print(f"Senior Manager: {sm.employee_id if sm else 'None'}")
        except Exception as e:
            print(f"Error resolving managers: {e}")
else:
    print(f"Trip {trip_id} not found.")

# Look for all trips by user HR-EMP-00006
user_id = 'HR-EMP-00006'
trips = Trip.objects.filter(user__employee_id=user_id)
print(f"\nAll trips for {user_id}:")
for t in trips:
    print(f"ID: {t.trip_id}, Status: {t.status}, Approver: {t.current_approver.employee_id if t.current_approver else 'None'}, RM Snapshot: {t.reporting_manager_name}")
