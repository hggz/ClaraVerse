# ClaraVerse Docker Services - Quick Commands

## Prerequisites
- Docker Desktop installed and running
- Ports 5001 and 5678 available

## Quick Setup (Copy & Paste)

```bash
# 1. Create network
docker network create clara_network

# 2. Create data directory
mkdir -p ~/.clara/n8n

# 3. Start Python backend
docker run -d \
  --name clara_python \
  --network clara_network \
  -p 5001:5000 \
  -v ~/.clara:/root/.clara \
  -e PYTHONUNBUFFERED=1 \
  --restart unless-stopped \
  clara17verse/clara-backend:latest

# 4. Start n8n workflows (with ARM64 compatibility)
docker run -d \
  --name clara_n8n \
  --network clara_network \
  --platform linux/amd64 \
  -p 5678:5678 \
  -v ~/.clara/n8n:/home/node/.n8n \
  --restart unless-stopped \
  n8nio/n8n:latest
```

## Using Docker Compose

```bash
# Start services
docker-compose -f docker-compose.manual.yml up -d

# Stop services
docker-compose -f docker-compose.manual.yml down

# View logs
docker-compose -f docker-compose.manual.yml logs -f
```

## Using the Setup Script

```bash
# Make executable and run
chmod +x manual_docker_setup.sh
./manual_docker_setup.sh
```

## Service Endpoints

- **Python API**: http://localhost:5001
  - Health check: http://localhost:5001/health
  - API docs: http://localhost:5001/docs

- **n8n Workflows**: http://localhost:5678
  - Web interface for creating automations

## Management Commands

```bash
# Check status
docker ps --filter name=clara

# View logs
docker logs clara_python
docker logs clara_n8n

# Stop services
docker stop clara_python clara_n8n

# Start services
docker start clara_python clara_n8n

# Remove services (will lose data if not using volumes)
docker rm clara_python clara_n8n

# Remove network
docker network rm clara_network
```

## Troubleshooting

### Port Conflicts
```bash
# Check what's using a port
lsof -i :5001
lsof -i :5678

# Use different ports
docker run -p 5002:5000 ... clara17verse/clara-backend:latest
docker run -p 5679:5678 ... n8nio/n8n:latest
```

### Permission Issues (Linux/macOS)
```bash
# Fix data directory permissions
sudo chown -R $(whoami) ~/.clara
```

### ARM64 Compatibility (Apple Silicon)
- n8n container uses `--platform linux/amd64` for compatibility
- Docker will automatically handle emulation

### Health Check
```bash
# Test Python API
curl http://localhost:5001/health

# Test n8n
curl -I http://localhost:5678
```

## Integration with ClaraVerse

Once these services are running:

1. **Electron App**: Will automatically detect and connect to the services
2. **Web App**: Limited functionality, primarily for chat features
3. **Services Tab**: Should show both services as "Available" and "Running"

The ClaraVerse Electron app will use these services for:
- Python backend processing
- Workflow automation via n8n
- Agent execution
- File management
