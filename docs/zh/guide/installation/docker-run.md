# Docker Run 部署

本指南介绍如何使用 `docker run` 命令部署 PPanel。此方法适合快速测试或简单部署。

::: tip 提示
对于生产环境，我们推荐使用 [Docker Compose](/zh/guide/installation/docker-compose)。
:::

## 前置条件

### 安装 Docker

**Ubuntu/Debian:**
```bash
# 更新包索引
sudo apt-get update

# 安装 Docker
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
# 安装 Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker
```

### 验证安装

```bash
docker --version
sudo docker run hello-world
```

## 快速开始

### 步骤 1: 拉取镜像

```bash
# 拉取最新版本
docker pull ppanel/ppanel:latest

# 或拉取指定版本
docker pull ppanel/ppanel:v0.1.2
```

### 步骤 2: 准备配置

```bash
# 创建配置目录
mkdir -p ~/ppanel-config

# 创建配置文件
cat > ~/ppanel-config/ppanel.yaml <<EOF
server:
  host: 0.0.0.0
  port: 8080

database:
  type: sqlite
  path: /app/data/ppanel.db
EOF
```

### 步骤 3: 运行容器

**基础命令:**
```bash
docker run -d \
  --name ppanel \
  -p 8080:8080 \
  -v ~/ppanel-config:/app/etc:ro \
  -v ppanel-data:/app/data \
  --restart unless-stopped \
  ppanel/ppanel:latest
```

**完整参数命令:**
```bash
docker run -d \
  --name ppanel \
  -p 8080:8080 \
  -v ~/ppanel-config:/app/etc:ro \
  -v ppanel-data:/app/data \
  -e TZ=Asia/Shanghai \
  --restart unless-stopped \
  --memory="2g" \
  --cpus="2" \
  ppanel/ppanel:latest
```

**参数说明:**
- `-d`: 以守护进程模式运行（后台运行）
- `--name ppanel`: 设置容器名称
- `-p 8080:8080`: 端口映射（宿主机:容器）
- `-v ~/ppanel-config:/app/etc:ro`: 挂载配置（只读）
- `-v ppanel-data:/app/data`: 创建数据卷
- `-e TZ=Asia/Shanghai`: 设置时区
- `--restart unless-stopped`: 自动重启策略
- `--memory="2g"`: 内存限制
- `--cpus="2"`: CPU 限制

### 步骤 4: 验证运行

```bash
# 查看容器状态
docker ps | grep ppanel

# 查看日志
docker logs -f ppanel

# 测试访问
curl http://localhost:8080
```

## 容器管理

### 查看日志

```bash
# 查看所有日志
docker logs ppanel

# 实时跟踪日志
docker logs -f ppanel

# 查看最后 100 行
docker logs --tail 100 ppanel

# 显示时间戳
docker logs -t ppanel
```

### 停止容器

```bash
docker stop ppanel
```

### 启动容器

```bash
docker start ppanel
```

### 重启容器

```bash
docker restart ppanel
```

### 删除容器

```bash
# 停止并删除
docker stop ppanel
docker rm ppanel
```

::: warning 注意
删除容器不会删除数据卷。要删除数据卷：
```bash
docker volume rm ppanel-data
```
:::

## 升级

### 备份数据

```bash
# 备份配置
tar czf ppanel-config-backup-$(date +%Y%m%d).tar.gz ~/ppanel-config/

# 备份数据卷
docker run --rm \
  -v ppanel-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/ppanel-data-backup-$(date +%Y%m%d).tar.gz /data
```

### 升级流程

```bash
# 拉取最新镜像
docker pull ppanel/ppanel:latest

# 停止旧容器
docker stop ppanel

# 删除旧容器
docker rm ppanel

# 使用相同配置启动新容器
docker run -d \
  --name ppanel \
  -p 8080:8080 \
  -v ~/ppanel-config:/app/etc:ro \
  -v ppanel-data:/app/data \
  --restart unless-stopped \
  ppanel/ppanel:latest

# 验证
docker logs -f ppanel
```

## 高级用法

### 自定义网络

```bash
# 创建网络
docker network create ppanel-net

# 在自定义网络上运行
docker run -d \
  --name ppanel \
  --network ppanel-net \
  -p 8080:8080 \
  -v ~/ppanel-config:/app/etc:ro \
  -v ppanel-data:/app/data \
  ppanel/ppanel:latest
```

### 环境变量

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

### 多实例部署

```bash
# 实例 1 使用端口 8081
docker run -d \
  --name ppanel-1 \
  -p 8081:8080 \
  -v ~/ppanel-config-1:/app/etc:ro \
  -v ppanel-data-1:/app/data \
  ppanel/ppanel:latest

# 实例 2 使用端口 8082
docker run -d \
  --name ppanel-2 \
  -p 8082:8080 \
  -v ~/ppanel-config-2:/app/etc:ro \
  -v ppanel-data-2:/app/data \
  ppanel/ppanel:latest
```

### 资源限制

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

## 故障排除

### 容器立即退出

```bash
# 查看日志
docker logs ppanel

# 检查架构
uname -m
docker image inspect ppanel/ppanel:latest --format '{{.Architecture}}'
```

### 端口被占用

```bash
# 检查什么在使用该端口
sudo lsof -i :8080

# 使用不同端口
docker run -d --name ppanel -p 8081:8080 ...
```

### 配置未加载

```bash
# 验证挂载
docker exec ppanel ls -la /app/etc

# 查看文件内容
docker exec ppanel cat /app/etc/ppanel.yaml

# 检查权限
ls -la ~/ppanel-config/
```

### 进入容器 Shell

```bash
# 进入 bash（如果可用）
docker exec -it ppanel bash

# 进入 sh
docker exec -it ppanel sh

# 运行命令
docker exec ppanel ls -la /app
```

## 下一步

- 尝试 [Docker Compose](/zh/guide/installation/docker-compose) 以获得更简单的管理方式
- 配置[反向代理](/zh/guide/installation/docker-compose#配置反向代理)
- 了解[配置选项](/zh/guide/configuration)

## 需要帮助？

- 查看 [GitHub Issues](https://github.com/perfect-panel/ppanel/issues)
- 查看 Docker 日志: `docker logs ppanel`
- 验证系统要求
