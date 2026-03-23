import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

from travel.serializers import TripSerializer
payload = {
    'source': 'a', 'destination': 'b', 'consider_as_local': False,
    'start_date': '2026-03-12', 'end_date': '2026-03-13',
    'composition': 'Solo', 'purpose': 'test', 'travel_mode': 'Airways',
    'project_code': 'PROJ-104', 'reporting_manager': '',
    'members': [], 'trip_leader': 'Self', 'accommodation_requests': []
}
ser = TripSerializer(data=payload)
if not ser.is_valid():
    print(ser.errors)
else:
    print("Valid!")
