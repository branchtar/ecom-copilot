FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/py

WORKDIR /app
COPY py/requirements.txt /app/py/requirements.txt
RUN pip install --no-cache-dir -r /app/py/requirements.txt

COPY py /app/py
# If you have a data/ folder you want persisted, App Runner will use ephemeral disk.
# We'll move to RDS later. For now keep it simple.
# COPY data /app/data

EXPOSE 8000
CMD ["uvicorn", "ecom_copilot_api:app", "--host", "0.0.0.0", "--port", "8000"]