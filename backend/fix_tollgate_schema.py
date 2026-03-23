import os
import django
import sys

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

from django.db import connection

def fix_schema():
    with connection.cursor() as cursor:
        try:
            print("Adding gate_code column to travel_masters_tollgate...")
            cursor.execute("ALTER TABLE travel_masters_tollgate ADD COLUMN gate_code VARCHAR(4) UNIQUE NULL AFTER deleted_at")
            print("Successfully added gate_code column.")
        except Exception as e:
            print(f"Error adding gate_code: {e}")

        try:
            print("Ensuring name column in travel_masters_tollgate is unique...")
            # Check if it already has a unique constraint? 
            # If not, add it.
            cursor.execute("ALTER TABLE travel_masters_tollgate ADD CONSTRAINT travel_masters_tollgate_name_unique UNIQUE (name)")
            print("Successfully added unique constraint to name.")
        except Exception as e:
            print(f"Error adding unique constraint to name: {e}")

if __name__ == "__main__":
    fix_schema()
