# backend_temp/Dockerfile
FROM python:3.10-slim-bullseye

WORKDIR /app

# Install system dependencies for building packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    libmariadb-dev-compat \
    libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app
USER app

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/ || exit 1

# Run the FastAPI application
CMD ["uvicorn", "app.admin_main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
