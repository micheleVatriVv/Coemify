FROM python:3.12-slim

# evita buffer strani nei log
ENV PYTHONUNBUFFERED=1

WORKDIR /

# install dipendenze
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copia il codice
COPY . .

# porta Fly
EXPOSE 8080

# comando di avvio (NON verrà sovrascritto)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]

