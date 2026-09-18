# ==============================================================================
# Unified Multi-Stage Dockerfile for LLM Watermarking Workbench
# Builds the React frontend and serves both API + UI via FastAPI
# Compatible with: Hugging Face Spaces (Port 7860), Railway, Render, and Local Docker
# ==============================================================================

# Stage 1: Build the React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend & Model Runtime
FROM python:3.10-slim
WORKDIR /app

# Install system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user (required for Hugging Face Spaces security, UID 1000)
RUN useradd -m -u 1000 user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    HF_HOME=/home/user/.cache/huggingface \
    PORT=7860

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application code
COPY backend/app ./app

# Copy compiled frontend assets from Stage 1 into /app/dist
COPY --from=frontend-builder /frontend/dist ./dist

# Set permissions for the non-root user
RUN mkdir -p /home/user/.cache/huggingface && \
    chown -R user:user /app /home/user

USER user

# Default port for Hugging Face Spaces is 7860; works with $PORT on Render/Railway
EXPOSE 7860

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
