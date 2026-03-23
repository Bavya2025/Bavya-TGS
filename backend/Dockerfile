FROM python:3.11-slim-bookworm

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install system dependencies & upgrade existing OS packages to patch vulnerabilities
RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
    default-libmysqlclient-dev \
    build-essential \
    pkg-config \
    netcat-traditional \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# First create the venv. Second, wipe the ensurepip bundles used to make it.
# Third, force upgrade the GLOBAL pip/wheel shipped with Python. Lastly, upgrade the venv versions!
RUN python -m venv /opt/venv \
    && rm -rf /usr/local/lib/python3.11/ensurepip/_bundled/ \
    && /usr/local/bin/python -m pip install --no-cache-dir --upgrade pip setuptools wheel \
    && /opt/venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel
ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# Copy project
COPY . /app/

# Copy and set entrypoint
COPY entrypoint.sh /app/
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]
