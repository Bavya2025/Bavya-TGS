import os
import django
from django.core.management import call_command

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

print("Making migrations...")
call_command('makemigrations', 'travel')

print("Migrating...")
call_command('migrate', 'travel')
print("Done.")
