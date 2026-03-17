import os
import django
import sys

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings') # Verify settings module name
django.setup()

from django.db import connection

def check_table():
    with connection.cursor() as cursor:
        try:
            cursor.execute("DESCRIBE travel_masters_tollgate")
            columns = cursor.fetchall()
            print("Columns in travel_masters_tollgate:")
            for col in columns:
                print(col)
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    check_table()
