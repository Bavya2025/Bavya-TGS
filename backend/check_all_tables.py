
import os
import django
from django.db import connection
from django.apps import apps

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

def check_all_travel_tables():
    with connection.cursor() as cursor:
        cursor.execute("SHOW TABLES")
        existing_tables = [row[0].lower() for row in cursor.fetchall()]
    
    app_config = apps.get_app_config('travel')
    missing = []
    
    print(f"Checking {len(app_config.models)} models...")
    for model_name, model in app_config.models.items():
        table_name = model._meta.db_table.lower()
        if table_name not in existing_tables:
            missing.append((model_name, table_name))
            print(f"MISSING: {model_name} -> {table_name}")
        else:
            # print(f"Found: {model_name} -> {table_name}")
            pass
            
    return missing

if __name__ == "__main__":
    missing = check_all_travel_tables()
    if not missing:
        print("Success: All expected tables exist.")
