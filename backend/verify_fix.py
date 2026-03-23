import os
import django
import sys

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

from travel_masters.models import TollGate

def check_tollgates():
    try:
        count = TollGate.objects.count()
        print(f"Successfully connected! TollGate count: {count}")
    except Exception as e:
        print(f"Still failing: {e}")

if __name__ == "__main__":
    check_tollgates()
