import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

with connection.cursor() as cursor:
    cursor.execute("DELETE FROM django_migrations WHERE app='travel' AND name LIKE '0003%'")
    cursor.execute("DELETE FROM django_migrations WHERE app='travel' AND name LIKE '0004%'")
    cursor.execute("DELETE FROM django_migrations WHERE app='travel' AND name LIKE '0005%'")
    print("MIGRATIONS CLEANED")
