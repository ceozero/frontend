# Binary Deployment

This guide shows you how to deploy PPanel using pre-built binary executables. This method is suitable for users who prefer not to use Docker or need more control over the deployment.

## Prerequisites

- **Operating System**: Linux (Ubuntu 20.04+, Debian 10+, CentOS 8+)
- **Architecture**: amd64 (x86_64) or arm64
- **Permissions**: Root or sudo access
- **Dependencies**: None (binaries are statically compiled)

## Download Binary

### Step 1: Check System Architecture

```bash
# Check your system architecture
uname -m
# Output: x86_64 (amd64) or aarch64 (arm64)
```

### Step 2: Download Latest Release

Visit the [GitHub Releases](https://github.com/perfect-panel/ppanel/releases) page or download directly:

```bash
# Create installation directory
sudo mkdir -p /opt/ppanel
cd /opt/ppanel

# Download for Linux amd64
wget https://github.com/perfect-panel/ppanel/releases/latest/download/ppanel-linux-amd64.tar.gz

# Or for Linux arm64
# wget https://github.com/perfect-panel/ppanel/releases/latest/download/ppanel-linux-arm64.tar.gz

# Extract
tar -xzf ppanel-linux-amd64.tar.gz

# Verify extracted files
ls -la
```

Expected files:
```
/opt/ppanel/
├── ppanel-server    # Main server binary
├── gateway          # Gateway binary
└── etc/             # Configuration directory
    └── ppanel.yaml  # Configuration file
```

## Configuration

### Step 1: Prepare Configuration

```bash
# Copy sample configuration
sudo cp etc/ppanel.yaml etc/ppanel.yaml.backup

# Edit configuration
sudo nano etc/ppanel.yaml
```

**Basic Configuration Example:**

```yaml
server:
  host: 0.0.0.0
  port: 8080
  mode: release  # debug, release, or test

database:
  type: sqlite
  path: /opt/ppanel/data/ppanel.db
  # For MySQL/PostgreSQL:
  # type: mysql
  # host: localhost
  # port: 3306
  # user: ppanel
  # password: your_password
  # database: ppanel

log:
  level: info  # debug, info, warn, error
  path: /opt/ppanel/logs

gateway:
  port: 8080
  timeout: 30s
```

### Step 2: Create Required Directories

```bash
# Create data and log directories
sudo mkdir -p /opt/ppanel/data
sudo mkdir -p /opt/ppanel/logs

# Set proper permissions
sudo chmod 755 /opt/ppanel
sudo chmod 700 /opt/ppanel/data
sudo chmod 755 /opt/ppanel/logs
```

## Running the Service

### Method 1: Direct Execution (Testing)

For quick testing:

```bash
# Make binaries executable
sudo chmod +x /opt/ppanel/ppanel-server
sudo chmod +x /opt/ppanel/gateway

# Run server directly
cd /opt/ppanel
sudo ./ppanel-server

# In another terminal, run gateway (if separate)
# sudo ./gateway
```

Press `Ctrl+C` to stop.

### Method 2: Systemd Service (Recommended)

Create a systemd service for production deployment:

#### Step 1: Create Service File

```bash
sudo nano /etc/systemd/system/ppanel.service
```

**Service File Content:**

```ini
[Unit]
Description=PPanel Server
Documentation=https://github.com/perfect-panel/ppanel
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/ppanel
ExecStart=/opt/ppanel/ppanel-server
Restart=always
RestartSec=10

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/ppanel/data /opt/ppanel/logs

# Resource limits
LimitNOFILE=65535
LimitNPROC=4096

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ppanel

[Install]
WantedBy=multi-user.target
```

#### Step 2: Enable and Start Service

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable ppanel

# Start service
sudo systemctl start ppanel

# Check status
sudo systemctl status ppanel
```

## Service Management

### Check Status

```bash
# Check if service is running
sudo systemctl status ppanel

# View detailed status
sudo systemctl show ppanel
```

### View Logs

```bash
# View systemd logs
sudo journalctl -u ppanel -f

# View last 100 lines
sudo journalctl -u ppanel -n 100

# View application logs
sudo tail -f /opt/ppanel/logs/ppanel.log
```

### Start/Stop/Restart

```bash
# Start service
sudo systemctl start ppanel

# Stop service
sudo systemctl stop ppanel

# Restart service
sudo systemctl restart ppanel

# Reload configuration (if supported)
sudo systemctl reload ppanel
```

### Enable/Disable Auto-start

```bash
# Enable auto-start on boot
sudo systemctl enable ppanel

# Disable auto-start
sudo systemctl disable ppanel

# Check if enabled
sudo systemctl is-enabled ppanel
```

## Post-Installation

### Verify Installation

```bash
# Check if service is listening
sudo netstat -tlnp | grep 8080

# Or use ss
sudo ss -tlnp | grep 8080

# Test HTTP access
curl http://localhost:8080

# Check process
ps aux | grep ppanel
```

### Access the Application

- **User Panel**: `http://your-server-ip:8080`
- **Admin Panel**: `http://your-server-ip:8080/admin`

### Configure Firewall

```bash
# Ubuntu/Debian (UFW)
sudo ufw allow 8080/tcp
sudo ufw status

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
sudo firewall-cmd --list-ports
```

### Setup Reverse Proxy

For production, use Nginx or Caddy as reverse proxy:

**Nginx Configuration** (`/etc/nginx/sites-available/ppanel`):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable the configuration:
```bash
sudo ln -s /etc/nginx/sites-available/ppanel /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Upgrading

### Backup Before Upgrade

```bash
# Stop service
sudo systemctl stop ppanel

# Backup current version
sudo cp -r /opt/ppanel /opt/ppanel-backup-$(date +%Y%m%d)

# Backup database
sudo cp /opt/ppanel/data/ppanel.db /opt/ppanel/data/ppanel.db.backup-$(date +%Y%m%d)

# Backup configuration
sudo cp /opt/ppanel/etc/ppanel.yaml /opt/ppanel/etc/ppanel.yaml.backup-$(date +%Y%m%d)
```

### Download and Install New Version

```bash
# Download new version
cd /tmp
wget https://github.com/perfect-panel/ppanel/releases/latest/download/ppanel-linux-amd64.tar.gz

# Extract to temporary location
mkdir ppanel-new
tar -xzf ppanel-linux-amd64.tar.gz -C ppanel-new

# Backup old binaries
sudo mv /opt/ppanel/ppanel-server /opt/ppanel/ppanel-server.old
sudo mv /opt/ppanel/gateway /opt/ppanel/gateway.old

# Install new binaries
sudo cp ppanel-new/ppanel-server /opt/ppanel/
sudo cp ppanel-new/gateway /opt/ppanel/

# Set permissions
sudo chmod +x /opt/ppanel/ppanel-server
sudo chmod +x /opt/ppanel/gateway

# Start service
sudo systemctl start ppanel

# Check status
sudo systemctl status ppanel
```

### Rollback

If upgrade fails:

```bash
# Stop service
sudo systemctl stop ppanel

# Restore old binaries
sudo mv /opt/ppanel/ppanel-server.old /opt/ppanel/ppanel-server
sudo mv /opt/ppanel/gateway.old /opt/ppanel/gateway

# Restore database (if needed)
sudo cp /opt/ppanel/data/ppanel.db.backup-YYYYMMDD /opt/ppanel/data/ppanel.db

# Start service
sudo systemctl start ppanel
```

## Troubleshooting

### Service Fails to Start

```bash
# Check detailed logs
sudo journalctl -u ppanel -xe

# Check configuration syntax
/opt/ppanel/ppanel-server --check-config

# Verify permissions
ls -la /opt/ppanel
sudo chown -R root:root /opt/ppanel
```

### Port Already in Use

```bash
# Find what's using the port
sudo lsof -i :8080
sudo netstat -tlnp | grep 8080

# Change port in configuration
sudo nano /opt/ppanel/etc/ppanel.yaml
# Update server.port value

# Restart service
sudo systemctl restart ppanel
```

### Binary Won't Execute

```bash
# Check architecture compatibility
uname -m
file /opt/ppanel/ppanel-server

# Check if executable
ls -la /opt/ppanel/ppanel-server
sudo chmod +x /opt/ppanel/ppanel-server

# Check for missing libraries (should be none for static binary)
ldd /opt/ppanel/ppanel-server
```

### High Memory Usage

```bash
# Check memory usage
ps aux | grep ppanel
top -p $(pgrep ppanel-server)

# Add memory limit to systemd service
sudo nano /etc/systemd/system/ppanel.service
# Add under [Service]:
# MemoryMax=2G
# MemoryHigh=1.5G

sudo systemctl daemon-reload
sudo systemctl restart ppanel
```

### Database Connection Issues

```bash
# Check database file permissions
ls -la /opt/ppanel/data/

# For SQLite, verify path in config
sudo nano /opt/ppanel/etc/ppanel.yaml

# Test database connection
sqlite3 /opt/ppanel/data/ppanel.db "SELECT 1;"

# Check logs for database errors
sudo journalctl -u ppanel | grep -i database
```

## Uninstallation

To completely remove PPanel:

```bash
# Stop and disable service
sudo systemctl stop ppanel
sudo systemctl disable ppanel

# Remove service file
sudo rm /etc/systemd/system/ppanel.service
sudo systemctl daemon-reload

# Remove installation directory
sudo rm -rf /opt/ppanel

# Remove firewall rules (if added)
sudo ufw delete allow 8080/tcp
# or
sudo firewall-cmd --permanent --remove-port=8080/tcp
sudo firewall-cmd --reload
```

## Advanced Configuration

### Running as Non-Root User

For better security, run as dedicated user:

```bash
# Create dedicated user
sudo useradd -r -s /bin/false ppanel

# Change ownership
sudo chown -R ppanel:ppanel /opt/ppanel

# Update systemd service
sudo nano /etc/systemd/system/ppanel.service
# Change: User=ppanel

# If binding to port < 1024, grant capability
sudo setcap 'cap_net_bind_service=+ep' /opt/ppanel/ppanel-server

sudo systemctl daemon-reload
sudo systemctl restart ppanel
```

### Multiple Instances

To run multiple instances:

```bash
# Create separate directories
sudo mkdir -p /opt/ppanel-1
sudo mkdir -p /opt/ppanel-2

# Copy binaries and configs
sudo cp -r /opt/ppanel/* /opt/ppanel-1/
sudo cp -r /opt/ppanel/* /opt/ppanel-2/

# Edit configs with different ports
sudo nano /opt/ppanel-1/etc/ppanel.yaml  # port: 8081
sudo nano /opt/ppanel-2/etc/ppanel.yaml  # port: 8082

# Create separate systemd services
sudo cp /etc/systemd/system/ppanel.service /etc/systemd/system/ppanel-1.service
sudo cp /etc/systemd/system/ppanel.service /etc/systemd/system/ppanel-2.service

# Edit service files accordingly
sudo systemctl daemon-reload
sudo systemctl enable ppanel-1 ppanel-2
sudo systemctl start ppanel-1 ppanel-2
```

### Custom Environment Variables

Add environment variables to systemd service:

```ini
[Service]
Environment="PPANEL_ENV=production"
Environment="PPANEL_DEBUG=false"
EnvironmentFile=/opt/ppanel/env.conf
```

## Performance Tuning

### Optimize File Limits

```bash
# Edit limits
sudo nano /etc/security/limits.conf

# Add:
* soft nofile 65535
* hard nofile 65535

# For systemd service, already set in service file:
# LimitNOFILE=65535
```

### Enable Database Optimization

For SQLite:

```bash
# Add to ppanel.yaml
database:
  type: sqlite
  path: /opt/ppanel/data/ppanel.db
  options:
    cache_size: -2000
    journal_mode: WAL
    synchronous: NORMAL
```

## Next Steps

- [Configuration Guide](/guide/configuration) - Detailed configuration options
- [Admin Dashboard](/admin/dashboard) - Start managing your panel
- [API Reference](/api/reference) - API integration

## Need Help?

- Check [GitHub Issues](https://github.com/perfect-panel/ppanel/issues)
- Review systemd logs: `sudo journalctl -u ppanel -f`
- Check application logs: `tail -f /opt/ppanel/logs/ppanel.log`
