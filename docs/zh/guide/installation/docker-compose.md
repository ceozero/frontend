# Docker Compose 部署

Docker Compose 是生产环境推荐的部署方式。它提供更好的服务管理、更简单的配置和更便捷的升级流程。

## 前置条件

### 安装 Docker

如果你还没有安装 Docker，请按照官方安装指南进行安装：

**Ubuntu/Debian:**
```bash
# 更新包索引
sudo apt-get update

# 安装必要的依赖包
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# 添加 Docker 官方 GPG 密钥
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 设置仓库
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

**CentOS/RHEL:**
```bash
# 安装 yum-utils
sudo yum install -y yum-utils

# 添加 Docker 仓库
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 安装 Docker Engine
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动 Docker 服务
sudo systemctl start docker
sudo systemctl enable docker
```

### 验证安装

```bash
# 查看 Docker 版本
docker --version

# 查看 Docker Compose 版本
docker compose version

# 测试 Docker 安装
sudo docker run hello-world
```

## 部署步骤

### 步骤 1: 创建项目目录

```bash
# 创建项目目录
mkdir -p ~/ppanel
cd ~/ppanel
```

### 步骤 2: 创建 docker-compose.yml

创建 `docker-compose.yml` 文件，内容如下：

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
      - TZ=Asia/Shanghai
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

**配置说明:**

- **image**: 使用的 Docker 镜像（latest 或指定版本如 `v0.1.2`）
- **ports**: 将容器的 8080 端口映射到宿主机的 8080 端口
- **volumes**:
  - `./ppanel-config:/app/etc:ro` - 配置目录（只读）
  - `ppanel-data:/app/data` - 持久化数据存储
- **restart**: 自动重启策略
- **environment**: 设置时区（可改为 `Asia/Shanghai` 等）
- **healthcheck**: 服务健康检查

### 步骤 3: 准备配置

```bash
# 创建配置目录
mkdir -p ppanel-config

# 创建配置文件
cat > ppanel-config/ppanel.yaml <<EOF
# PPanel 配置文件
server:
  host: 0.0.0.0
  port: 8080

database:
  type: sqlite
  path: /app/data/ppanel.db

# 根据需要添加更多配置
EOF
```

::: tip 提示
详细的配置选项请参考 [配置指南](/zh/guide/configuration)。
:::

### 步骤 4: 启动服务

```bash
# 拉取最新镜像
docker compose pull

# 以守护进程模式启动
docker compose up -d

# 查看日志
docker compose logs -f
```

### 步骤 5: 验证部署

```bash
# 查看服务状态
docker compose ps

# 测试服务是否可访问
curl http://localhost:8080

# 查看实时日志
docker compose logs -f ppanel
```

## 部署后配置

### 访问应用

安装成功后，你可以通过以下地址访问：

- **用户面板**: `http://your-server-ip:8080`
- **管理后台**: `http://your-server-ip:8080/admin`

::: warning 默认凭据
为了安全起见，首次登录后请立即修改默认管理员密码。
:::

### 配置反向代理（推荐）

对于生产环境部署，建议使用 Nginx 或 Caddy 作为反向代理以启用 HTTPS。

**Nginx 配置:**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
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

**Caddy 配置:**

```
your-domain.com {
    reverse_proxy localhost:8080
}
```

::: tip 提示
Caddy 会通过 Let's Encrypt 自动处理 SSL 证书。
:::

## 服务管理

### 查看日志

```bash
# 查看所有日志
docker compose logs

# 实时跟踪日志
docker compose logs -f

# 查看特定服务日志
docker compose logs ppanel
```

### 停止服务

```bash
# 停止所有服务
docker compose stop

# 停止特定服务
docker compose stop ppanel
```

### 重启服务

```bash
# 重启所有服务
docker compose restart

# 重启特定服务
docker compose restart ppanel
```

### 停止并删除服务

```bash
# 停止并删除容器
docker compose down

# 停止并删除容器和数据卷
docker compose down -v
```

::: warning 数据持久化
使用 `docker compose down -v` 会删除所有数据卷。只有在想完全清除所有数据时才使用此命令。
:::

## 升级

### 升级前备份

```bash
# 备份配置
tar czf ppanel-config-backup-$(date +%Y%m%d).tar.gz ppanel-config/

# 备份数据卷
docker run --rm \
  -v ppanel_ppanel-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/ppanel-data-backup-$(date +%Y%m%d).tar.gz /data
```

### 升级步骤

```bash
# 拉取最新镜像
docker compose pull

# 使用新镜像重新创建容器
docker compose up -d

# 查看日志验证
docker compose logs -f
```

### 回滚

如果升级后遇到问题：

```bash
# 编辑 docker-compose.yml，将镜像改为之前的版本
# image: ppanel/ppanel:v0.1.1

# 使用之前的版本重启
docker compose up -d
```

## 高级配置

### 自定义端口

要使用不同的端口，编辑 `docker-compose.yml`：

```yaml
ports:
  - "3000:8080"  # 宿主机端口 3000 -> 容器端口 8080
```

### 多实例部署

要运行多个实例，创建独立的目录：

```bash
# 实例 1
mkdir ~/ppanel-1
cd ~/ppanel-1
# 创建 docker-compose.yml，使用端口 8081

# 实例 2
mkdir ~/ppanel-2
cd ~/ppanel-2
# 创建 docker-compose.yml，使用端口 8082
```

### 资源限制

添加资源限制以防止过度消耗：

```yaml
services:
  ppanel:
    # ... 其他配置 ...
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 自定义网络

创建自定义网络以获得更好的隔离：

```yaml
version: '3.8'

services:
  ppanel:
    # ... 其他配置 ...
    networks:
      - ppanel-net

networks:
  ppanel-net:
    driver: bridge
```

## 故障排除

### 容器启动失败

```bash
# 查看错误日志
docker compose logs ppanel

# 检查容器状态
docker compose ps

# 验证配置
docker compose config
```

### 端口被占用

```bash
# 检查什么在使用该端口
sudo lsof -i :8080

# 在 docker-compose.yml 中更改端口
# ports:
#   - "8081:8080"
```

### 权限问题

```bash
# 修复配置目录权限
sudo chown -R $USER:$USER ppanel-config/

# 确保文件可读
chmod 644 ppanel-config/ppanel.yaml
```

### 无法从外部访问

1. **检查防火墙规则:**
   ```bash
   # Ubuntu/Debian
   sudo ufw allow 8080

   # CentOS/RHEL
   sudo firewall-cmd --add-port=8080/tcp --permanent
   sudo firewall-cmd --reload
   ```

2. **验证服务是否监听:**
   ```bash
   docker compose ps
   netstat -tlnp | grep 8080
   ```

## 下一步

- [配置指南](/zh/guide/configuration) - 详细的配置选项
- [管理后台](/zh/admin/dashboard) - 开始管理你的面板
- [API 参考](/zh/api/reference) - API 集成指南

## 需要帮助？

如果遇到任何问题：

1. 查看上面的[故障排除](#故障排除)部分
2. 查看 [Docker Compose 日志](#查看日志)
3. 搜索 [GitHub Issues](https://github.com/perfect-panel/ppanel/issues)
4. 创建新 issue 并附上详细的系统信息和日志
