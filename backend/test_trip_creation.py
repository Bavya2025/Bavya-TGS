import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE','tgs_backend.settings')
django.setup()

from travel.models import Trip
from core.models import User

user = User.objects.filter(is_active=True).first()
print('user', user)

# simulate serializer behavior as API
from travel.serializers import TripSerializer
payload = {
    'source': 'Various (Local)',
    'destination': 'Various (Local)',
    'consider_as_local': True,
    'start_date': '2026-03-01',
    'end_date': '2026-03-31',
    'composition': 'Solo',
    'purpose': 'test',
    'travel_mode': 'Car / Jeep / Van',
    'project_code': 'General',
}

from travel.models import Trip
serializer = TripSerializer(data=payload)
if serializer.is_valid():
    print('validated data:', serializer.validated_data)
    # manually compute what trip_id would be using same logic
    data = serializer.validated_data
    import datetime, calendar, re
    proj = (data.get('project_code') or 'GS').upper()
    if proj == 'GENERAL': proj = 'GS'
    branch = 'GEN'
    if user:
        base_loc = user.base_location or ''
        if base_loc:
            try:
                from travel_masters.models import Location
                loc = Location.objects.filter(name__icontains=base_loc).first()
                if loc and loc.code:
                    branch = loc.code.upper()
                else:
                    clean_loc = re.sub(r'[^a-zA-Z0-9]', '', base_loc)
                    branch = clean_loc[:3].upper() if len(clean_loc) >= 3 else clean_loc.upper()
            except Exception as ex:
                print('branch lookup error', ex)
    ref_date = data.get('start_date') or datetime.date.today()
    month_year = f"{calendar.month_abbr[ref_date.month].lower()}{ref_date.year}"
    base_id = f"ITS-{proj}-{branch}-{month_year}"
    seq = 1
    generated = base_id
    while Trip.objects.filter(trip_id=generated).exists():
        generated = f"{base_id}-{seq:02d}"
        seq += 1
    print('calculated id would be', generated, 'length', len(generated))
    try:
        # create instance without saving then run save logic step-by-step
        trip = Trip(**serializer.validated_data)
        trip.user = user
        # simulate save() logic up to id generation
        is_new = trip._state.adding
        if not trip.trip_id:
            if trip.consider_as_local:
                proj = (trip.project_code or 'GS').upper()
                if proj == 'GENERAL': proj = 'GS'
                branch = 'GEN'
                if trip.user:
                    base_loc = trip.user.base_location
                    if base_loc:
                        try:
                            from travel_masters.models import Location
                            loc = Location.objects.filter(name__icontains=base_loc).first()
                            if loc and loc.code:
                                branch = loc.code.upper()
                            else:
                                import re
                                clean_loc = re.sub(r'[^a-zA-Z0-9]', '', base_loc)
                                branch = clean_loc[:3].upper() if len(clean_loc) >= 3 else clean_loc.upper()
                        except Exception:
                            pass
                import calendar
                ref_date = trip.start_date or datetime.date.today()
                month_year = f"{calendar.month_abbr[ref_date.month].lower()}{ref_date.year}"
                base_id = f"ITS-{proj}-{branch}-{month_year}"
                generated_id = base_id
                seq = 1
                while Trip.objects.filter(trip_id=generated_id).exists():
                    generated_id = f"{base_id}-{seq:02d}"
                    seq += 1
                trip.trip_id = generated_id
        print('trip.trip_id before save', trip.trip_id, 'len', len(trip.trip_id))
        trip.save()
        print('saved', trip.trip_id)
    except Exception as e:
        import traceback
        traceback.print_exc()
else:
    print('serializer errors', serializer.errors)

