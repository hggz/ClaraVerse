#!/bin/bash

# Manual Docker Setup for ClaraVerse
# This script manually sets up the Docker services that ClaraVerse uses

set -e

echo "🚀 ClaraVerse Manual Docker Setup"
echo "=================================="

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✅ Docker is running"

# Create Clara network
echo "📡 Creating Clara network..."
if docker network ls --format "{{.Name}}" | grep -q "^clara_network$"; then
    echo "ℹ️  Clara network already exists"
else
    docker network create clara_network
    echo "✅ Created clara_network"
fi

# Create Clara data directory
CLARA_DATA_DIR="$HOME/.clara"
mkdir -p "$CLARA_DATA_DIR/n8n"
echo "📁 Created Clara data directory: $CLARA_DATA_DIR"

# Pull and start Python backend
echo "🐍 Setting up Python backend..."
docker pull clara17verse/clara-backend:latest
docker stop clara_python 2>/dev/null || true
docker rm clara_python 2>/dev/null || true

docker run -d \
    --name clara_python \
    --network clara_network \
    -p 5001:5000 \
    -v "$CLARA_DATA_DIR:/root/.clara" \
    -e PYTHONUNBUFFERED=1 \
    -e OLLAMA_BASE_URL=http://clara_ollama:11434 \
    --restart unless-stopped \
    clara17verse/clara-backend:latest

echo "✅ Python backend started on port 5001"

# Pull and start n8n (with platform specification for ARM64 compatibility)
echo "🔄 Setting up n8n workflows..."
docker pull --platform linux/amd64 n8nio/n8n:latest
docker stop clara_n8n 2>/dev/null || true
docker rm clara_n8n 2>/dev/null || true

docker run -d \
    --name clara_n8n \
    --network clara_network \
    --platform linux/amd64 \
    -p 5678:5678 \
    -v "$CLARA_DATA_DIR/n8n:/home/node/.n8n" \
    --restart unless-stopped \
    n8nio/n8n:latest

echo "✅ n8n workflows started on port 5678"

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Test services
echo "🔍 Testing services..."

# Test Python backend
if curl -s http://localhost:5001/health >/dev/null; then
    echo "✅ Python backend is healthy (http://localhost:5001)"
else
    echo "⚠️  Python backend may still be starting up"
fi

# Test n8n
if curl -s -I http://localhost:5678 | grep -q "200 OK"; then
    echo "✅ n8n is healthy (http://localhost:5678)"
else
    echo "⚠️  n8n may still be starting up"
fi

echo ""
echo "🎉 ClaraVerse Docker services setup complete!"
echo "📊 Service Status:"
echo "   🐍 Python API: http://localhost:5001"
echo "   🔄 n8n Workflows: http://localhost:5678"
echo ""
echo "💡 To check status: docker ps --filter name=clara"
echo "🛑 To stop services: docker stop clara_python clara_n8n"
echo "🗑️  To remove services: docker rm clara_python clara_n8n"
