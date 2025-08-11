FROM python:3.12-slim

# Install system dependencies including curl for health checks
RUN apt-get update && \
    apt-get install -y curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install uv globally
RUN pip install --no-cache-dir uv

# Copy pyproject.toml first for dependency installation
COPY pyproject.toml ./

# Create venv with uv and install dependencies only
RUN uv venv /app/.venv && \
    . /app/.venv/bin/activate && \
    uv pip install -r pyproject.toml

# Copy the rest of the application
COPY . .

# Set environment variable to use the venv
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app"


# Expose the port the API runs on
EXPOSE 8000

# Command to run the API
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]