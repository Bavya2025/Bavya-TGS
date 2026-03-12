import os
import django
import sys

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

from django.db import connection

def check_tables():
    tables = [
        "travel_masters_location",
        "travel_masters_route",
        "travel_masters_routepath",
        "travel_masters_tollgate",
        "travel_masters_tollrate",
        "travel_masters_routepathtoll"
    ]
    with connection.cursor() as cursor:
        for table in tables:
            try:
                cursor.execute(f"DESCRIBE {table}")
                columns = cursor.fetchall()
                print(f"\nColumns in {table}:")
                for col in columns:
                    print(col)
            except Exception as e:
                print(f"Error checking {table}: {e}")

if __name__ == "__main__":
    check_tables()
