# Docker Deployment Guide

This guide covers how to run the GitHub Repository Analyzer using Docker containers.

## Quick Start

### Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)
- Git

### 1. Clone and Setup

```bash
git clone <your-repository-url>
cd github-repo-analyzer
```

### 2. Environment Configuration

Copy the environment template and configure your settings:

```bash
# Copy the environment template
cp .env.local.example .env.local

# Edit the environment file
# Add your GitHub Personal Access Token for higher rate limits
nano .env.local
```

Required environment variables:
```env
# GitHub Personal Access Token (recommended)
GITHUB_PAT=your_github_personal_access_token_here

# Docker configuration
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
```

### 3. Production Deployment

#### Using Docker Compose (Recommended)

```bash
# Build and start the application
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

#### Using Docker Build & Run

```bash
# Build the Docker image
docker build -t github-repo-analyzer .

# Run the container
docker run -d \
  --name github-repo-analyzer \
  -p 3000:3000 \
  --env-file .env.local \
  --restart unless-stopped \
  github-repo-analyzer

# View logs
docker logs -f github-repo-analyzer

# Stop the container
docker stop github-repo-analyzer
docker rm github-repo-analyzer
```

### 4. Development Mode

For development with hot-reloading:

```bash
# Start development environment
docker-compose --profile development up -d github-repo-analyzer-dev

# This will start the app on port 3001 with hot-reloading
# Access at: http://localhost:3001
```

## Configuration Options

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GITHUB_PAT` | GitHub Personal Access Token | - | Recommended |
| `NODE_ENV` | Node.js environment | `production` | No |
| `PORT` | Application port | `3000` | No |
| `HOSTNAME` | Application hostname | `0.0.0.0` | No |
| `ENABLE_UNGH_FALLBACK` | Enable ungh.cc fallback | `false` | No |
| `API_CACHE_TTL` | API cache duration (seconds) | `600` | No |

### GitHub Personal Access Token

To avoid rate limiting, create a GitHub Personal Access Token:

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with these scopes:
   - `public_repo` (for public repositories)
   - `repo` (for private repositories, if needed)
3. Add the token to your `.env.local` file

## Docker Images

### Production Image Features

- **Multi-stage build** for optimized image size
- **Alpine Linux** base for security and efficiency
- **Non-root user** for enhanced security
- **Health checks** for container monitoring
- **Minimal attack surface** with only production dependencies

### Image Sizes

- Production image: ~150MB (after build optimization)
- Development image: ~200MB (includes dev dependencies)

## Networking

### Ports

- **3000**: Production application (default)
- **3001**: Development application (when using dev profile)

### Health Check

The application includes a health check endpoint at `/api/health` that monitors:
- Application status
- Uptime
- Environment information
- Version details

Access the health check:
```bash
curl http://localhost:3000/api/health
```

## Monitoring and Logs

### Container Logs

```bash
# Follow logs for all services
docker-compose logs -f

# Follow logs for specific service
docker-compose logs -f github-repo-analyzer

# View recent logs
docker-compose logs --tail=100 github-repo-analyzer
```

### Health Monitoring

```bash
# Check container health status
docker ps

# Inspect health check details
docker inspect github-repo-analyzer | grep -A 20 Health
```

### Application Metrics

The health endpoint provides runtime metrics:
```bash
curl http://localhost:3000/api/health | jq
```

## Performance Optimization

### Memory Limits

For production deployments, consider setting memory limits:

```yaml
# In docker-compose.yml
services:
  github-repo-analyzer:
    deploy:
      resources:
        limits:
          memory: 512M
        reservations:
          memory: 256M
```

### Volume Mounts

For persistent cache (optional):

```yaml
volumes:
  - ./cache:/app/.next/cache
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change the port mapping if 3000 is in use
   ```bash
   docker-compose up -d --scale github-repo-analyzer=1 -p 8080:3000
   ```

2. **Memory issues**: Increase container memory limits
3. **Build failures**: Clear Docker cache and rebuild
   ```bash
   docker system prune -a
   docker-compose build --no-cache
   ```

### Debug Mode

Run with debug output:
```bash
DEBUG=* docker-compose up
```

### Container Shell Access

```bash
# Access running container
docker exec -it github-repo-analyzer sh

# Start temporary container for debugging
docker run -it --rm github-repo-analyzer sh
```

## Security Considerations

### Best Practices

- Always use the non-root user (automatically configured)
- Keep the base image updated
- Use secrets management for sensitive tokens
- Enable container scanning in CI/CD
- Limit container resources

### Environment Security

```bash
# Use Docker secrets (for production)
echo "your_github_token" | docker secret create github_pat -

# Reference in compose file
secrets:
  - github_pat
```

## Production Deployment

### Orchestration

For production deployments, consider:

- **Kubernetes**: Use the provided manifests
- **Docker Swarm**: Scale horizontally
- **Load Balancer**: Nginx or Traefik (labels included)

### CI/CD Integration

```yaml
# Example GitHub Actions
- name: Build and push Docker image
  uses: docker/build-push-action@v4
  with:
    context: .
    push: true
    tags: your-registry/github-repo-analyzer:latest
```

## Updates and Maintenance

### Updating the Application

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Backup and Restore

The application is stateless, but you may want to backup:
- Environment configuration
- Custom settings
- Cached data (if using persistent volumes)

## Support

For Docker-related issues:
1. Check the container logs
2. Verify environment configuration
3. Test the health endpoint
4. Review resource usage
5. Check network connectivity

---

**Note**: This containerized setup maintains all existing functionality while providing production-ready deployment options. 