import os
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

with connection.cursor() as cursor:
    cursor.execute("DESCRIBE travel_jobreport")
    rows = cursor.fetchall()
    for row in rows:
        print(row)
