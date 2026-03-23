from django.contrib.auth.models import User
from travel_masters.models import FuelRateMaster
from employee_masters.models import Employee
import json

def test_rate():
    user = User.objects.filter(username='10001').first()
    if not user:
        print("User 10001 not found")
        return
    
    state = ''
    try:
        if hasattr(user, 'employee') and user.employee.office:
            state = user.employee.office.state or ''
    except Exception as e:
        print(f"Error getting state: {e}")
        
    print(f"User: {user.username}, State: {state}")
    
    vehicle_types = ['2 Wheeler', '4 Wheeler']
    for vt in vehicle_types:
        rate_obj = FuelRateMaster.objects.filter(state__iexact=state, vehicle_type__iexact=vt).first()
        if not rate_obj:
            rate_obj = FuelRateMaster.objects.filter(state__icontains=state, vehicle_type__iexact=vt).first()
        
        if rate_obj:
            print(f"Rate for {vt}: {rate_obj.rate_per_km}")
        else:
            print(f"Rate for {vt}: Not found")

if __name__ == '__main__':
    test_rate()
