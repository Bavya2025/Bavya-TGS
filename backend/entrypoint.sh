#!/bin/sh

# Check if DB variables are present to avoid "no destination" errors
if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ]; then
  echo "ERROR: DB_HOST or DB_PORT not set. This image must be run via docker-compose."
  exit 1
fi

# Wait for database
echo "Waiting for database at $DB_HOST:$DB_PORT..."
while ! nc -z $DB_HOST $DB_PORT; do
  sleep 0.5
done
echo "Database started"

# Case-based startup logic
case "$1" in
  "scheduler")
    echo "Starting Scheduler..."
    python manage.py run_scheduler
    ;;
  "web")
    echo "Running migrations..."
    python manage.py migrate
    
    echo "Setting up initial data..."
    python manage.py create_admin
    python manage.py setup_masters
    
    echo "Starting Gunicorn (2 workers)..."
    # Reduced workers to 2 to prevent OOM (Exit 137) on constrained hosts
    gunicorn tgs_backend.wsgi:application --bind 0.0.0.0:8000 --workers 2
    ;;
  *)
    # Default behavior (Combined, for backwards compatibility if run manually)
    echo "Running migrations..."
    python manage.py migrate
    
    echo "Starting Gunicorn (2 workers)..."
    gunicorn tgs_backend.wsgi:application --bind 0.0.0.0:8000 --workers 2 &
    
    echo "Starting Scheduler..."
    python manage.py run_scheduler &
    
    wait
    ;;
esac
