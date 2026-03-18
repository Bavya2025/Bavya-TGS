
import os
import django
from django.db import connection, ProgrammingError
from django.apps import apps

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

def test_all_models():
    for app in apps.get_app_configs():
        if app.label in ['admin', 'auth', 'contenttypes', 'sessions']:
            continue
            
        print(f"Testing app: {app.label}")
        for model_name, model in app.models.items():
            table_name = model._meta.db_table
            try:
                with connection.cursor() as cursor:
                    cursor.execute(f"SELECT 1 FROM {table_name} LIMIT 1")
                # print(f"  OK: {model_name} ({table_name})")
            except ProgrammingError as e:
                print(f"  FAILED: {model_name} ({table_name}) - {e}")
            except Exception as e:
                print(f"  ERROR: {model_name} ({table_name}) - {e}")

if __name__ == "__main__":
    test_all_models()
