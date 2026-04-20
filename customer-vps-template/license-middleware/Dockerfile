FROM python:3.11-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy service code
COPY service.py config.py client.py hmac_signer.py logger.py ./

# Run as non-root user
RUN useradd -m -u 1000 license && chown -R license:license /app
USER license

# Healthcheck
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s \
  CMD python -c "import sys; sys.exit(0)"

CMD ["python", "-u", "service.py"]
