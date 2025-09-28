# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Create data directory
RUN mkdir -p /app/data

# Copy data from parent directory
COPY ../data /app/data

# Expose port 8000
EXPOSE 8000

# Command to run the FastAPI server
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "${PORT:-8000}"]