#!/bin/sh

# Wait for database
echo "Waiting for database..."
while ! nc -z $DB_HOST $DB_PORT; do
  sleep 0.1
done
echo "Database started"

# Run migrations
echo "Running migrations..."
python manage.py migrate

# Initialize roles/admin (if your script handles it)
# python manage.py setup_initial_data

# Start Gunicorn
echo "Starting Gunicorn..."
gunicorn tgs_backend.wsgi:application --bind 0.0.0.0:8000 --workers 3 &

# Start Scheduler in background
echo "Starting Scheduler..."
python manage.py run_scheduler

# Keep the script running
wait
