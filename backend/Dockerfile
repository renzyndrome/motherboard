FROM python:3.9-slim

WORKDIR /app

# Install system dependencies including netcat
RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    build-essential \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

# Copy wait script
COPY wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Use wait-for-it script to wait for MySQL
CMD ["/bin/bash", "-c", "/wait-for-it.sh db:3306 -t 60 -- uvicorn main:app --host 0.0.0.0 --port 8000 --reload"]