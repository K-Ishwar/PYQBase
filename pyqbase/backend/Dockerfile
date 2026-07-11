FROM python:3.12-slim AS builder

WORKDIR /app
COPY requirements.txt .

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies (no-cache to save space in builder, though it's discarded)
RUN pip install --no-cache-dir -r requirements.txt

# Runner stage
FROM python:3.12-slim AS runner

WORKDIR /app

# Copy the venv from builder
COPY --from=builder /opt/venv /opt/venv

# Make sure we use the venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy the rest of the application
COPY . .

EXPOSE 8000

# Run uvicorn (optimized for fast cold starts)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
