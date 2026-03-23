import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

from travel.models import Trip

try:
    t = Trip.objects.get(trip_id='ITS-PROJ-104-VIJ-mar26-07')
    print('Trip ID:', t.trip_id)
    print('Status:', t.status)
    print('Current Approver:', t.current_approver.username if t.current_approver else 'None')
    print('Lifecycle:', t.lifecycle_events)
except Exception as e:
    print('Error:', str(e))
