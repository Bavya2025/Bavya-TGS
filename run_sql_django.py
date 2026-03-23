import os
import django
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tgs_backend.settings')
django.setup()

from django.db import connection

def run_sql_script(filename):
    try:
        with open(filename, 'r') as f:
            sql = f.read()
            
        # Split by semicolon to run multiple statements
        statements = sql.split(';')
        with connection.cursor() as cursor:
            for statement in statements:
                if statement.strip():
                    try:
                        cursor.execute(statement)
                    except Exception as err:
                        print(f"Error executing statement: {err}")
                        # print(f"Statement: {statement[:100]}...")
        
        print("SQL script executed successfully via Django connection.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    run_sql_script("setup_masters.sql")
