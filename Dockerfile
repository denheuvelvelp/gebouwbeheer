FROM python:3.12-slim

# Omgevingsinstellingen
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

WORKDIR /app

# Kopieer repository
COPY . /app

# Maak data directory aan
RUN mkdir -p /app/data

EXPOSE 8080

# Start Gateway
CMD ["python3", "serve.py"]
