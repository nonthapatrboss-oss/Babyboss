FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
build-essential \
libssl-dev \
libffi-dev \
&& rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN touch analysis/__init__.py signals/__init__.py notifications/__init__.py news/__init__.py db/__init__.py

EXPOSE 8000

CMD uvicorn main:app --host 0.0.0.0 --port 8000
