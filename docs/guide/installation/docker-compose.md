# Docker Compose Deployment

Docker Compose is the recommended deployment method for production environments. It provides better service management, easier configuration, and simplified upgrades.

## Prerequisites

### Install Docker

If you haven't installed Docker yet, please follow the official installation guide:

**Ubuntu/Debian:**
```bash
# Update package index
sudo apt-get update

# Install required packages
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

**CentOS/RHEL:**
```bash
# Install yum-utils
sudo yum install -y yum-utils

# Add Docker repository
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker Engine
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker
```

### Verify Installation

```bash
# Check Docker version
docker --version

# Check Docker Compose version
docker compose version

# Test Docker installation
sudo docker run hello-world
```

## Deployment Steps

### Step 1: Create Project Directory

```bash
# Create project directory
mkdir -p ~/ppanel
cd ~/ppanel
```

### Step 2: Create docker-compose.yml

Create a `docker-compose.yml` file with the following content:

```yaml
version: '3.8'

services:
  ppanel:
    image: ppanel/ppanel:latest
    container_name: ppanel
    ports:
      - "8080:8080"
    volumes:
      - ./ppanel-config:/app/etc:ro
      - ppanel-data:/app/data
    restart: unless-stopped
    environment:
      - TZ=UTC
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  ppanel-data:
    driver: local
```

**Configuration Explanation:**

- **image**: Docker image to use (latest or specific version like `v0.1.2`)
- **ports**: Map container port 8080 to host port 8080
- **volumes**:
  - `./ppanel-config:/app/etc:ro` - Configuration directory (read-only)
  - `ppanel-data:/app/data` - Persistent data storage
- **restart**: Auto-restart policy
- **environment**: Set timezone (change to your timezone like `Asia/Shanghai`)
- **healthcheck**: Monitor service health

### Step 3: Prepare Configuration

```bash
# Create configuration directory
mkdir -p ppanel-config

# Create configuration file
cat > ppanel-config/ppanel.yaml <<EOF
# PPanel Configuration
server:
  host: 0.0.0.0
  port: 8080

database:
  type: sqlite
  path: /app/data/ppanel.db

# Add more configuration as needed
EOF
```

::: tip
For detailed configuration options, please refer to the [Configuration Guide](/guide/configuration).
:::

### Step 4: Start Services

```bash
# Pull the latest image
docker compose pull

# Start in detached mode
docker compose up -d

# View logs
docker compose logs -f
```

### Step 5: Verify Deployment

```bash
# Check service status
docker compose ps

# Check if service is accessible
curl http://localhost:8080

# View real-time logs
docker compose logs -f ppanel
```

## Post-Installation

### Access the Application

After successful installation, you can access:

- **User Panel**: `http://your-server-ip:8080`
- **Admin Panel**: `http://your-server-ip:8080/admin`

::: warning Default Credentials
Please change the default admin password immediately after first login for security.
:::

### Configure Reverse Proxy (Recommended)

For production deployment, it's recommended to use Nginx or Caddy as a reverse proxy to enable HTTPS.

**Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
    }
}
```

**Caddy Configuration:**

```
your-domain.com {
    reverse_proxy localhost:8080
}
```

::: tip
Caddy automatically handles SSL certificates via Let's Encrypt.
:::

## Service Management

### View Logs

```bash
# View all logs
docker compose logs

# Follow logs in real-time
docker compose logs -f

# View specific service logs
docker compose logs ppanel
```

### Stop Services

```bash
# Stop all services
docker compose stop

# Stop specific service
docker compose stop ppanel
```

### Restart Services

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart ppanel
```

### Stop and Remove Services

```bash
# Stop and remove containers
docker compose down

# Stop and remove containers and volumes
docker compose down -v
```

::: warning Data Persistence
Using `docker compose down -v` will delete all data volumes. Only use this if you want to completely remove all data.
:::

## Upgrading

### Backup Before Upgrade

```bash
# Backup configuration
tar czf ppanel-config-backup-$(date +%Y%m%d).tar.gz ppanel-config/

# Backup data volume
docker run --rm \
  -v ppanel_ppanel-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/ppanel-data-backup-$(date +%Y%m%d).tar.gz /data
```

### Upgrade Steps

```bash
# Pull latest image
docker compose pull

# Recreate containers with new image
docker compose up -d

# View logs to verify
docker compose logs -f
```

### Rollback

If you encounter issues after upgrading:

```bash
# Edit docker-compose.yml and change image to previous version
# image: ppanel/ppanel:v0.1.1

# Restart with previous version
docker compose up -d
```

## Advanced Configuration

### Custom Port

To use a different port, edit `docker-compose.yml`:

```yaml
ports:
  - "3000:8080"  # Host port 3000 -> Container port 8080
```

### Multiple Instances

To run multiple instances, create separate directories:

```bash
# Instance 1
mkdir ~/ppanel-1
cd ~/ppanel-1
# Create docker-compose.yml with port 8081

# Instance 2
mkdir ~/ppanel-2
cd ~/ppanel-2
# Create docker-compose.yml with port 8082
```

### Resource Limits

Add resource limits to prevent overconsumption:

```yaml
services:
  ppanel:
    # ... other config ...
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Custom Network

Create a custom network for better isolation:

```yaml
version: '3.8'

services:
  ppanel:
    # ... other config ...
    networks:
      - ppanel-net

networks:
  ppanel-net:
    driver: bridge
```

## Troubleshooting

### Container Fails to Start

```bash
# Check logs for errors
docker compose logs ppanel

# Check container status
docker compose ps

# Verify configuration
docker compose config
```

### Port Already in Use

```bash
# Check what's using the port
sudo lsof -i :8080

# Change port in docker-compose.yml
# ports:
#   - "8081:8080"
```

### Permission Issues

```bash
# Fix configuration directory permissions
sudo chown -R $USER:$USER ppanel-config/

# Make sure files are readable
chmod 644 ppanel-config/ppanel.yaml
```

### Cannot Access from Outside

1. **Check firewall rules:**
   ```bash
   # Ubuntu/Debian
   sudo ufw allow 8080

   # CentOS/RHEL
   sudo firewall-cmd --add-port=8080/tcp --permanent
   sudo firewall-cmd --reload
   ```

2. **Verify service is listening:**
   ```bash
   docker compose ps
   netstat -tlnp | grep 8080
   ```

## Next Steps

- [Configuration Guide](/guide/configuration) - Detailed configuration options
- [Admin Dashboard](/admin/dashboard) - Start managing your panel
- [API Reference](/api/reference) - API integration guide

## Need Help?

If you encounter any issues:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review [Docker Compose logs](#view-logs)
3. Search [GitHub Issues](https://github.com/perfect-panel/ppanel/issues)
4. Create a new issue with detailed system information and logs
