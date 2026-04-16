# [FilixPay](https://www.filixpay.com) 私有化部署文档

> **项目**：[FilixPay](https://www.filixpay.com) 商户支付平台  
> **版本**：v1.0  
> **最后更新**：2026-04-16

---

本文档描述了 FilixPay 平台的完整部署流程，分为三大核心部分：

- **Part 1 — 商户中心前端部署**：基于 Docker 镜像一键启动商户中心 Web 应用。
- **Part 2 — 收银台前端部署**：基于 Docker 镜像一键启动收银台 Web 应用。
- **Part 3 — 后台服务环境部署**：使用 Docker Compose 部署核心基础设施服务，包括 Redis、MySQL 和 Keycloak。

📎 **相关文件**：[docker-compose.yml](./docker-compose.yml) — 点击下载或查看后台服务编排配置。

---

# Part 1 — 商户中心前端部署

## 快速开始

无需下载源码，只需执行一条命令和脚本，即可在本地快速运行体验：

### 1. 拉取镜像
```bash
docker pull ghcr.io/filixpay/filix-merchant:v1.0
```

### 2. 一键运行

参考下方商户中心智能启动脚本进行部署。您可以将其保存为 `start.sh` 直接运行（注：脚本已适配直接拉取镜像的形式，去除了需要源码的构建步骤）。

```bash
#!/bin/bash

# ================= 配置区域 =================
CONTAINER_NAME="filix-merchant"
# 使用直接拉取到的远端镜像
IMAGE_NAME="ghcr.io/filixpay/filix-merchant:v1.0"
ENV_FILE=".env.local"
PORT_HOST=3000
PORT_CONTAINER=3000
# ===========================================

echo "🚀 开始智能部署 [${CONTAINER_NAME}]..."

# 1. 停止并删除旧容器
echo "🛑 清理旧容器..."
docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

# 2. 启动新容器
echo "📦 正在启动容器 (端口: ${PORT_HOST}:${PORT_CONTAINER})..."

# 定义基础运行参数数组 (安全且稳健)
RUN_ARGS=(
  -d
  --name "${CONTAINER_NAME}"
  -p "${PORT_HOST}:${PORT_CONTAINER}"
  -e NODE_ENV=production
  -e PORT="${PORT_CONTAINER}"
  -e HOSTNAME="0.0.0.0"
  # 默认覆盖值，如果 .env.local 中有则会被后者覆盖
  -e "NEXTAUTH_URL=https://www.filixpay.com/auth-api/auth"
  -e "NEXTAUTH_URL_INTERNAL=http://localhost:${PORT_CONTAINER}"
  -e "KEYCLOAK_CLIENT_ID=merchant-center"
  -e "KEYCLOAK_ISSUER=https://www.filixpay.com/auth/realms/merchant-center"
  --restart unless-stopped
)

# 如果存在 .env.local，加入参数
# .env.local 中的变量优先级更高，会覆盖上面的默认值
if [ -f "$ENV_FILE" ]; then
  echo "📄 检测到 $ENV_FILE，将加载环境变量 (优先级最高)..."
  RUN_ARGS+=(--env-file "$ENV_FILE")
else
  echo "⚠️ 未找到 $ENV_FILE，仅使用默认及命令行传递的环境变量..."
  echo "   ⚠️ 警告: 若未设置 KEYCLOAK_CLIENT_SECRET 或 NEXTAUTH_SECRET，服务可能无法启动!"
fi

# 最后加上镜像名
RUN_ARGS+=("${IMAGE_NAME}")

# 执行命令
docker run "${RUN_ARGS[@]}"

# 3. 检查状态
sleep 2
STATUS=$(docker inspect -f '{{.State.Status}}' "${CONTAINER_NAME}" 2>/dev/null)

if [ "$STATUS" == "running" ]; then
  echo "✅ 容器启动成功！"
  echo ""
  echo "📊 运行信息："
  docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  echo ""
  echo "🔗 访问地址: http://localhost:${PORT_HOST}"
  echo "💡 查看实时日志: docker logs -f ${CONTAINER_NAME}"
  echo "🧹 提示：如需清理旧镜像节省空间，可运行: docker image prune -f"
else
  echo "❌ 容器启动失败或立即退出！状态: ${STATUS:-'未知'}"
  echo "📝 最后 20 行日志:"
  docker logs --tail 20 "${CONTAINER_NAME}" 2>/dev/null || echo "无法获取日志（容器可能未创建）"
  
  # 额外提示：如果是密钥缺失导致的失败
  if [ ! -f "$ENV_FILE" ]; then
    echo ""
    echo "💡 建议：请创建 .env.local 文件并填入必要的密钥，例如："
    echo "   KEYCLOAK_CLIENT_SECRET=your_secret_here"
    echo "   NEXTAUTH_SECRET=your_nextauth_secret_here"
  fi
  exit 1
fi
```

---

# Part 2 — 收银台前端部署

## 快速开始

无需下载源码，只需执行一条命令和脚本，即可在本地快速运行体验：

### 1. 拉取镜像
```bash
docker pull ghcr.io/filixpay/filix-checkout:v1.0
```

### 2. 一键运行

参考下方收银台智能启动脚本进行部署。您可以将其保存为 `start-checkout.sh` 直接运行（注：脚本已适配直接拉取镜像的形式，去除了需要源码的构建步骤）。

```bash
#!/bin/bash

# ================= 配置区域 =================
CONTAINER_NAME="filix-checkout"
IMAGE_NAME="ghcr.io/filixpay/filix-checkout:v1.0"
ENV_FILE=".env.local"
PORT_HOST=3001
PORT_CONTAINER=3001
# ===========================================

echo "🚀 开始智能部署 [${CONTAINER_NAME}]..."

# 1. 停止并删除旧容器
echo "🛑 清理旧容器..."
docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

# 2. 启动新容器
echo "📦 正在启动容器 (端口: ${PORT_HOST}:${PORT_CONTAINER})..."

# 定义基础运行参数数组，避免字符串拼接错误
# 注意：这里我们根据文件是否存在，动态决定要不要加 --env-file
RUN_ARGS=(
  -d
  --name "${CONTAINER_NAME}"
  -p "${PORT_HOST}:${PORT_CONTAINER}"
  -e NODE_ENV=production
  -e PORT="${PORT_CONTAINER}"
  -e HOSTNAME="0.0.0.0"
  -e "NEXTAUTH_URL_INTERNAL=http://localhost:${PORT_CONTAINER}"
  --restart unless-stopped
)

# 如果存在 .env.local，加入参数
if [ -f "$ENV_FILE" ]; then
  echo "📄 检测到 $ENV_FILE，将加载环境变量 (优先级最高)..."
  RUN_ARGS+=(--env-file "$ENV_FILE")
else
  echo "⚠️ 未找到 $ENV_FILE，仅使用默认及命令行传递的环境变量..."
fi

# 最后加上镜像名
RUN_ARGS+=("${IMAGE_NAME}")

# 执行命令
docker run "${RUN_ARGS[@]}"

# 3. 检查状态
sleep 2
STATUS=$(docker inspect -f '{{.State.Status}}' "${CONTAINER_NAME}" 2>/dev/null)

if [ "$STATUS" == "running" ]; then
  echo "✅ 容器启动成功！"
  echo ""
  echo "📊 运行信息："
  docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  echo ""
  echo "🔗 访问地址: http://localhost:${PORT_HOST}"
  echo "💡 查看实时日志: docker logs -f ${CONTAINER_NAME}"
  echo "🧹 提示：如需清理旧镜像节省空间，可运行: docker image prune -f"
else
  echo "❌ 容器启动失败或立即退出！状态: ${STATUS:-'未知'}"
  echo "📝 最后 20 行日志:"
  docker logs --tail 20 "${CONTAINER_NAME}" 2>/dev/null || echo "无法获取日志（容器可能未创建）"
  exit 1
fi
```

---

# Part 3 — 后台服务环境部署

以下内容描述如何使用 Docker Compose 部署 FilixPay 平台的核心基础设施服务，包括 **缓存服务 (Redis)**、**数据库服务 (MySQL)** 以及 **身份认证服务 (Keycloak)**。

## 1. 前置条件

### 1.1 系统要求

| 项目         | 最低要求                  |
| ------------ | ------------------------ |
| 操作系统     | Linux (推荐 Ubuntu 22.04+) |
| Docker       | 20.10+                   |
| Docker Compose | v2.0+                  |
| 可用内存     | ≥ 4 GB                   |
| 可用磁盘     | ≥ 20 GB                  |

### 1.2 网络端口

请确保以下端口未被占用且防火墙已放行：

| 端口   | 服务     | 用途                  |
| ------ | -------- | -------------------- |
| `6379` | Redis    | 缓存服务              |
| `3306` | MySQL    | 数据库（可通过 `.env` 自定义） |
| `8080` | Keycloak | HTTP（内部/调试）      |
| `8443` | Keycloak | HTTPS（对外服务）      |

## 2. 目录结构

在部署目录下，需按以下结构提前准备好目录和文件：

```text
filixpay-deploy/
├── docker-compose.yml          # 编排配置文件
├── .env                        # 环境变量（敏感信息，勿提交版本库）
├── certs/                      # SSL/TLS 证书目录
│   ├── filixpay.com.pem        # Keycloak HTTPS 证书
│   └── filixpay.com.key        # Keycloak HTTPS 私钥
├── redis/
│   └── data/                   # Redis AOF 持久化数据
└── mysql/mysql/
    ├── data/                   # MySQL 数据文件
    ├── conf/                   # MySQL 自定义配置 (*.cnf)
    ├── logs/                   # MySQL 日志输出
    └── init-scripts/           # 首次启动时自动执行的 SQL 脚本
```

> **提示**：`init-scripts/` 目录中的 `.sql` 或 `.sh` 文件仅在 MySQL **首次初始化**（`data/` 目录为空）时自动执行。

## 3. 环境变量配置

在 `docker-compose.yml` 同级目录下创建 `.env` 文件：

```properties
# ============ 基础配置 ============
COMPOSE_PROJECT_NAME=filixdb-prod
TZ=Asia/Shanghai

# ============ Redis ============
REDIS_PASSWORD=<替换为安全密码>

# ============ MySQL ============
MYSQL_PORT=3306
MYSQL_ROOT_PASSWORD=<替换为安全密码>
MYSQL_DATABASE=filixpay

# ============ Keycloak ============
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=<替换为安全密码>
KEYCLOAK_DB_USER=keycloak
KEYCLOAK_DB_PASSWORD=<替换为安全密码>
KEYCLOAK_HOSTNAME=auth.filixpay.com
```

> **⚠️ 安全提醒**：请使用强密码，并确保 `.env` 文件不被提交到版本控制系统（已在 `.gitignore` 中排除）。

## 4. 服务架构

```text
┌──────────┐     ┌──────────┐     ┌───────────┐
│  Redis   │     │  MySQL   │◄────│ Keycloak  │
│  :6379   │     │  :3306   │     │ :8080/8443│
└──────────┘     └──────────┘     └───────────┘
      │                │                │
      └────────────────┴────────────────┘
                  app-network (bridge)
```

### 4.1 Redis (v7.2) — 缓存服务

| 配置项         | 值                    |
| ------------- | --------------------- |
| 最大内存       | 256 MB                |
| 淘汰策略       | `allkeys-lru`         |
| 持久化方式     | AOF (`appendfsync everysec`) |
| 健康检查间隔   | 10s                   |

### 4.2 MySQL (v8.0) — 核心数据库

| 配置项                | 值                    |
| -------------------- | --------------------- |
| 字符集               | `utf8mb4_unicode_ci`   |
| 表名大小写            | 不区分 (`lower-case-table-names=1`) |
| 最大连接数            | 200                   |
| InnoDB 缓冲池         | 512 MB                |
| 资源限制（内存/CPU）   | 1 GB / 1 核           |
| 日志滚动              | 单文件最大 10 MB，保留 3 份 |

### 4.3 Keycloak (v26.0.0) — 身份认证服务

| 配置项           | 值                     |
| --------------- | ---------------------- |
| 运行模式         | `start`（生产模式）     |
| 缓存模式         | `local`（单节点）       |
| 数据库后端       | 同网络 MySQL 容器       |
| HTTPS 证书       | `/certs/filixpay.com.*` |
| 访问路径前缀     | `/auth`                |
| 健康检查 & 指标  | 已启用                  |

## 5. 操作手册

### 5.1 首次部署

```bash
# 1. 进入部署目录
cd /opt/filixpay-deploy

# 2. 确认 .env 和 certs/ 已准备就绪

# 3. 启动所有服务（后台运行）
docker-compose up -d

# 4. 查看服务启动状态
docker-compose ps
```

### 5.2 重启服务

```bash
# 重启全部服务
docker-compose restart

# 仅重启某个服务（如 Keycloak）
docker-compose restart keycloak
```

### 5.3 停止与清理

```bash
# 停止并移除容器（保留数据卷）
docker-compose down --remove-orphans

# 停止并移除容器 + 匿名数据卷（⚠️ 慎用）
docker-compose down -v --remove-orphans
```

> **⚠️ 警告**：`-v` 参数会删除匿名卷。由于本项目的数据通过 bind mount 映射到宿主机目录，主要数据不会丢失，但仍建议在执行前做好备份。

### 5.4 查看日志

```bash
# 查看 Keycloak 日志（实时，最后 500 行）
docker logs -f --tail 500 filixdb-prod-keycloak

# 查看应用服务日志
docker logs -f --tail 500 filixdb-prod-wildfly

# 查看 MySQL 日志
docker logs -f --tail 500 filixdb-prod-mysql

# 查看 Redis 日志
docker logs -f --tail 500 filixdb-prod-redis
```

### 5.5 数据库连接

```bash
# 从宿主机通过 CLI 连接 MySQL
docker exec -it filixdb-prod-mysql mysql -uroot -p

# 通过 Redis CLI 连接
docker exec -it filixdb-prod-redis redis-cli -a <REDIS_PASSWORD>
```

## 6. 注意事项

1. **Keycloak 管理员账号仅首次生效**：`KC_BOOTSTRAP_ADMIN_USERNAME` / `KC_BOOTSTRAP_ADMIN_PASSWORD` 只会在 Keycloak 首次初始化空白数据库时创建 Admin 用户，后续修改 `.env` 中的该值**不会**更新已有账号密码。
2. **服务启动顺序**：Keycloak 配置了 `depends_on: mysql (service_healthy)`，将自动等待 MySQL 健康检查通过后再启动，初次启动可能需要 1-2 分钟，请耐心等待。
3. **HTTPS 证书必须存在**：Keycloak 配置了 HTTPS 证书路径挂载，若 `certs/` 目录下缺少对应证书文件将导致服务启动失败。
4. **MySQL 初始化脚本**：需要为 Keycloak 预建数据库和用户，建议在 `init-scripts/` 下放置类似如下 SQL：
   ```sql
   CREATE DATABASE IF NOT EXISTS keycloak CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER IF NOT EXISTS 'keycloak'@'%' IDENTIFIED BY '<KEYCLOAK_DB_PASSWORD>';
   GRANT ALL PRIVILEGES ON keycloak.* TO 'keycloak'@'%';
   FLUSH PRIVILEGES;
   ```
