import os, sys, django
sys.path.append('backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.models import User
try:
    u = User.objects.get(name='Demo DM')
    print('--- Approval Flow of Demo DM ---')
    data = u._get_api_data()
    pos_details = data.get('positions_details', [])
    reporting_to = pos_details[0].get('reporting_to', []) if pos_details else []
    print("RAW reporting_to Array List Structure:")
    print(reporting_to)
except Exception as e:
    print("User not found or error:", e)
