# 商户部署指南

> **适用对象：** 已在 [FilixPay](https://www.filixpay.com) 开通 Checkout 服务的商户，希望在自己的服务器或域名下运行收银台。  
> **无需改代码：** 通过 Docker 镜像 + 环境变量即可完成部署。

本仓库是开源收银台前端（Next.js + BFF）。商户自行托管部署后，付款页面与 API 代理运行在**您自己的域名/服务器**上，FilixPay 支付能力通过 Checkout API 对接。

---

## 1. 你需要准备什么

| 项目 | 说明 |
|------|------|
| FilixPay 商户账号 | 已在平台完成商户配置与收款方式设置 |
| 服务端 API 凭证 | 在 FilixPay **开发者中心**创建 `FILIXPAY_BACKEND_CLIENT_ID` / `FILIXPAY_BACKEND_CLIENT_SECRET` |
| OIDC 客户端（可选） | 若需钱包/信用支付登录，配置 `KEYCLOAK_*` 与 `NEXTAUTH_*` |
| 服务器 | 支持 Docker 的 Linux 主机（或本地先验证） |
| 域名 + HTTPS（生产推荐） | 通过 Nginx/Caddy 等反向代理暴露服务 |

复制仓库根目录 [`.env.example`](../.env.example) 为部署用环境文件（例如 `/etc/filix-checkout/env`），**所有 API 地址与凭证均通过该文件注入，镜像内不包含任何默认生产地址。**

---

## 2. 部署方式概览

| 方式 | 适合场景 |
|------|----------|
| **拉取 GHCR 镜像（推荐）** | 商户生产环境，无需 Node.js 构建环境 |
| **本地 Docker 构建** | 需要自定义镜像或无法访问 GHCR 时 |
| **源码开发模式** | 二次开发或联调，见 [docs/README.md](./README.md) |

---

## 3. 方式 A：拉取官方镜像（推荐）

### 3.1 准备环境文件

```bash
cp .env.example /etc/filix-checkout/env
# 编辑 /etc/filix-checkout/env，填入您的 API 基址、Token URL、凭证等
chmod 600 /etc/filix-checkout/env
```

必填项参见 [`.env.example`](../.env.example) 注释；至少配置：

- `FILIXPAY_BACKEND_CLIENT_ID` / `FILIXPAY_BACKEND_CLIENT_SECRET`
- `FILIXPAY_TOKEN_URL`
- `BACKEND_API_URL`（及文档中列出的其他 `FILIXPAY_*` URL）
- `NEXTAUTH_URL`（设为对外访问的完整 URL，如 `https://checkout.example.com`）
- `NEXTAUTH_SECRET`（随机长字符串）

### 3.2 拉取并运行

```bash
docker pull ghcr.io/filixpay/filix-checkout:latest

docker run -d \
  --name filix-checkout \
  --restart unless-stopped \
  -p 127.0.0.1:3001:3001 \
  --env-file /etc/filix-checkout/env \
  ghcr.io/filixpay/filix-checkout:latest
```

生产环境建议**固定镜像 tag**（如 `:v1.0.0`），避免 `latest` 自动升级带来意外变更。

### 3.3 验证

```bash
docker logs -f filix-checkout
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/order
```

浏览器访问（未配置反向代理时）：

- 下单页：`http://<服务器IP>:3001/order`
- 收银台：`http://<服务器IP>:3001/`

---

## 4. 方式 B：在服务器上构建镜像

```bash
git clone https://github.com/filixpay/filix-checkout.git
cd filix-checkout
cp .env.example .env.local   # 编辑后作为运行配置

docker build -t filix-checkout:local .
docker run -d \
  --name filix-checkout \
  --restart unless-stopped \
  -p 127.0.0.1:3001:3001 \
  --env-file .env.local \
  filix-checkout:local
```

或使用仓库脚本（会读取 `ENV_FILE`，默认 `.env.local`）：

```bash
chmod +x deploy.sh
ENV_FILE=/etc/filix-checkout/env ./deploy.sh
```

---

## 5. 绑定自有域名（Nginx 示例）

容器默认只监听本机 `3001`，对外暴露请用反向代理并启用 HTTPS。

### 5.1 独立子域名（推荐）

将 `checkout.example.com` 整站指向收银台，路径与开发环境一致，无需额外路径重写。

```nginx
server {
    listen 443 ssl http2;
    server_name checkout.example.com;

    # ssl_certificate ...;
    # ssl_certificate_key ...;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }
}
```

环境文件中设置：

```env
NEXTAUTH_URL=https://checkout.example.com
```

访问示例：

- `https://checkout.example.com/order`
- `https://checkout.example.com/`

### 5.2 挂载在主站路径下（如 `/checkout`）

若必须使用 `https://example.com/checkout/...`，反向代理需**去掉路径前缀**再转发（本仓库默认未配置 Next.js `basePath`）：

```nginx
location /checkout/ {
    proxy_pass http://127.0.0.1:3001/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_read_timeout 60s;
    proxy_connect_timeout 60s;
}
```

环境文件中 `NEXTAUTH_URL` 需与对外 URL 一致，例如：

```env
NEXTAUTH_URL=https://example.com/checkout
```

访问示例：

- `https://example.com/checkout/order`

---

## 6. 升级与重启

使用 GHCR 时，可在服务器上通过 [scripts/deploy-pull.sh](../scripts/deploy-pull.sh) 拉取新镜像并重启（需配置 `GHCR_USER` / `GHCR_TOKEN` 读取 packages 权限）：

```bash
export CHECKOUT_IMAGE=ghcr.io/filixpay/filix-checkout:latest
export DEPLOY_ENV_FILE=/etc/filix-checkout/ghcr.env
./scripts/deploy-pull.sh
```

或手动：

```bash
docker pull ghcr.io/filixpay/filix-checkout:latest
docker stop filix-checkout && docker rm filix-checkout
# 再次 docker run（同第 3.2 节）
```

---

## 7. 安全与运维

- **切勿**将 `.env.local`、环境文件或 API Secret 提交到 Git 或写入镜像。
- 环境文件权限建议 `600`，仅 root 或部署账号可读。
- 在 FilixPay 开发者中心定期轮换 `FILIXPAY_BACKEND_CLIENT_SECRET`。
- 生产务必使用 HTTPS；`NEXTAUTH_URL` 必须与用户浏览器地址栏一致。
- 本仓库为 Apache-2.0 开源软件；商户自行承担托管、合规与业务风险。

---

## 8. 进一步阅读

| 文档 | 内容 |
|------|------|
| [docs/README.md](./README.md) | 本地开发、环境变量、贡献说明 |
| [crypto-integration.md](./crypto-integration.md) | CRYPTO（TRON-USDT）通道行为 |
| [risk-resume-integration.md](./risk-resume-integration.md) | 风控拦截与续跑流程 |
| [README.md](../README.md) | 项目概览（英文） |

如在 FilixPay 开发者中心获取凭证或配置收款方式时需要帮助，请参阅 [FilixPay 官方文档](https://www.filixpay.com) 或联系 FilixPay 支持。
