# Docker Run Deployment

This guide shows you how to deploy PPanel using the `docker run` command. This method is suitable for quick testing or simple deployments.

::: tip
For production environments, we recommend using [Docker Compose](/guide/installation/docker-compose) instead.
:::

## Prerequisites

### Install Docker

**Ubuntu/Debian:**
```bash
# Update package index
sudo apt-get update

# Install Docker
sudo apt-get install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io
```

**CentOS/RHEL:**
```bash
# Install Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
```

### Verify Installation

```bash
docker --version
sudo docker run hello-world
```

## Quick Start

### Step 1: Pull the Image

```bash
# Pull latest version
docker pull ppanel/ppanel:latest

# Or pull a specific version
docker pull ppanel/ppanel:v0.1.2
```

### Step 2: Prepare Configuration

```bash
# Create configuration directory
mkdir -p ~/ppanel-config

# Create configuration file
cat > ~/ppanel-config/ppanel.yaml <<EOF
server:
  host: 0.0.0.0
  port: 8080

database:
  type: sqlite
  path: /app/data/ppanel.db
EOF
```

### Step 3: Run Container

**Basic Command:**
```bash
docker run -d \
  --name ppanel \
  -p 8080:8080 \
  -v ~/ppanel-config:/app/etc:ro \
  -v ppanel-data:/app/data \
  --restart unless-stopped \
  ppanel/ppanel:latest
```

**With All Options:**
```bash
docker run -d \
  --name ppanel \
  -p 8080:8080 \
  -v ~/ppanel-config:/app/etc:ro \
  -v ppanel-data:/app/data \
  -e TZ=UTC \
  --restart unless-stopped \
  --memory="2g" \
  --cpus="2" \
  ppanel/ppanel:latest
```

**Parameter Explanation:**
- `-d`: Run in detached mode (background)
- `--name ppanel`: Set container name
- `-p 8080:8080`: Map port (host:container)
- `-v ~/ppanel-config:/app/etc:ro`: Mount configuration (read-only)
- `-v ppanel-data:/app/data`: Create data volume
- `-e TZ=UTC`: Set timezone
- `--restart unless-stopped`: Auto-restart policy
- `--memory="2g"`: Memory limit
- `--cpus="2"`: CPU limit

### Step 4: Verify Running

```bash
# Check container status
docker ps | grep ppanel

# View logs
docker logs -f ppanel

# Test access
curl http://localhost:8080
```

## Container Management

### View Logs

```bash
# View all logs
docker logs ppanel

# Follow logs in real-time
docker logs -f ppanel

# View last 100 lines
docker logs --tail 100 ppanel

# View logs with timestamps
docker logs -t ppanel
```

### Stop Container

```bash
docker stop ppanel
```

### Start Container

```bash
docker start ppanel
```

### Restart Container

```bash
docker restart ppanel
```

### Remove Container

```bash
# Stop and remove
docker stop ppanel
docker rm ppanel
```

::: warning
Removing the container does not delete the data volume. To remove the volume:
```bash
docker volume rm ppanel-data
```
:::

## Upgrading

### Backup Data

```bash
# Backup configuration
tar czf ppanel-config-backup-$(date +%Y%m%d).tar.gz ~/ppanel-config/

# Backup data volume
docker run --rm \
  -v ppanel-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/ppanel-data-backup-$(date +%Y%m%d).tar.gz /data
```

### Upgrade Process

```bash
# Pull latest image
docker pull ppanel/ppanel:latest

# Stop old container
docker stop ppanel

# Remove old container
docker rm ppanel

# Start new container with same configuration
docker run -d \
  --name ppanel \
  -p 8080:8080 \
  -v ~/ppanel-config:/app/etc:ro \
  -v ppanel-data:/app/data \
  --restart unless-stopped \
  ppanel/ppanel:latest

# Verify
docker logs -f ppanel
```

## Advanced Usage

### Custom Network

```bash
# Create network
docker network create ppanel-net

# Run with custom network
docker run -d \
  --name ppanel \
  --network ppanel-net \
  -p 8080:8080 \
  -v ~/ppanel-config:/app/etc:ro \
  -v ppanel-data:/app/data \
  ppanel/ppanel:latest
```

### Environment Variables

```bash
docker run -d \
  --name ppanel \
  -p 8080:8080 \
  -e SERVER_PORT=8080 \
  -e DATABASE_TYPE=sqlite \
  -e TZ=Asia/Shanghai \
  -v ~/ppanel-config:/app/etc:ro \
  -v ppanel-data:/app/data \
  ppanel/ppanel:latest
```

### Multiple Instances

```bash
# Instance 1 on port 8081
docker run -d \
  --name ppanel-1 \
  -p 8081:8080 \
  -v ~/ppanel-config-1:/app/etc:ro \
  -v ppanel-data-1:/app/data \
  ppanel/ppanel:latest

# Instance 2 on port 8082
docker run -d \
  --name ppanel-2 \
  -p 8082:8080 \
  -v ~/ppanel-config-2:/app/etc:ro \
  -v ppanel-data-2:/app/data \
  ppanel/ppanel:latest
```

### Resource Limits

```bash
docker run -d \
  --name ppanel \
  -p 8080:8080 \
  --memory="2g" \
  --memory-swap="2g" \
  --cpus="2" \
  --pids-limit=100 \
  -v ~/ppanel-config:/app/etc:ro \
  -v ppanel-data:/app/data \
  ppanel/ppanel:latest
```

## Troubleshooting

### Container Exits Immediately

```bash
# Check logs
docker logs ppanel

# Check architecture
uname -m
docker image inspect ppanel/ppanel:latest --format '{{.Architecture}}'
```

### Port Already in Use

```bash
# Check what's using the port
sudo lsof -i :8080

# Use different port
docker run -d --name ppanel -p 8081:8080 ...
```

### Configuration Not Loading

```bash
# Verify mount
docker exec ppanel ls -la /app/etc

# Check file content
docker exec ppanel cat /app/etc/ppanel.yaml

# Check permissions
ls -la ~/ppanel-config/
```

### Access Container Shell

```bash
# Access bash (if available)
docker exec -it ppanel bash

# Access sh
docker exec -it ppanel sh

# Run command
docker exec ppanel ls -la /app
```

## Next Steps

- Try [Docker Compose](/guide/installation/docker-compose) for easier management
- Configure [Reverse Proxy](/guide/installation/docker-compose#configure-reverse-proxy)
- Learn about [Configuration](/guide/configuration)

## Need Help?

- Check [GitHub Issues](https://github.com/perfect-panel/ppanel/issues)
- Review Docker logs: `docker logs ppanel`
- Verify system requirements
