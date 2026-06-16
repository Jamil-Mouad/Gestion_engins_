FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8090
CMD ["gunicorn", "app:create_app()", "--bind", "0.0.0.0:8090", "--timeout", "120", "--workers", "2"]
