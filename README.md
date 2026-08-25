# Filix Checkout

Open-source checkout frontend for [FilixPay](https://www.filixpay.com). Built with Next.js, it provides a payment UI and BFF layer that proxies FilixPay Checkout APIs (QR, wallet, crypto, bank transfer, risk resume, and more).

本仓库是开源收银台前端（Next.js + BFF）。商户自行托管后，付款页面与 API 代理运行在**您自己的域名/服务器**上；FilixPay 支付能力通过 Checkout API 对接，核心风控与渠道逻辑仍由 FilixPay 后端处理。**无需改代码**，通过 Docker 镜像 + 环境变量即可部署。

## Documentation | 文档

| Document | Description |
|----------|-------------|
| [docs/merchant-deployment.md](docs/merchant-deployment.md) | **商户部署指南（完整版）** — Docker / GHCR、自有域名、Nginx、FAQ |
| [docs/README.md](docs/README.md) | 文档索引 / full docs index |

---

## 商户独立收银台部署（摘要）

> **适用对象：** 已在 FilixPay 开通服务的商户，希望在**自己的服务器和域名**下独立部署收银台。  
> 完整步骤、路径挂载、升级与 FAQ 见 [docs/merchant-deployment.md](docs/merchant-deployment.md)。

### 为什么选择独立部署？

- **域名与品牌可控** — 付款页运行在 `checkout.yourdomain.com`，有助于降低支付流失、提升信任感
- **数据与合规边界清晰** — 前端代码、访问日志、部署环境在您自己的服务器上
- **开源可审计** — Apache-2.0，不依赖黑盒页面
- **对接成本低** — 仅需配置环境变量，支持 GHCR 镜像一键拉取

### 你需要准备什么

| 项目 | 说明 |
|------|------|
| FilixPay 商户账号 | 已完成商户配置与收款方式设置 |
| 服务端 API 凭证 | 开发者中心创建 `FILIXPAY_BACKEND_CLIENT_ID` / `FILIXPAY_BACKEND_CLIENT_SECRET` |
| OIDC 客户端（可选） | 钱包/信用支付登录时配置 `KEYCLOAK_*` 与 `NEXTAUTH_*` |
| 服务器 | 支持 Docker 的 Linux 主机 |
| 域名 + HTTPS（生产推荐） | Nginx/Caddy 等反向代理 |

复制 [`.env.example`](.env.example) 为部署用环境文件（如 `/etc/filix-checkout/env`）。**所有 API 地址与凭证均通过该文件注入，镜像内不包含任何默认生产地址。**

### 推荐：拉取 GHCR 镜像

```bash
cp .env.example /etc/filix-checkout/env
# 编辑环境文件：至少配置 FILIXPAY_*、BACKEND_API_URL、NEXTAUTH_URL、NEXTAUTH_SECRET
chmod 600 /etc/filix-checkout/env

docker pull ghcr.io/filixpay/filix-checkout:latest

docker run -d \
  --name filix-checkout \
  --restart unless-stopped \
  -p 127.0.0.1:3001:3001 \
  --env-file /etc/filix-checkout/env \
  ghcr.io/filixpay/filix-checkout:latest
```

生产建议**固定镜像 tag**（如 `:v1.0.0`），避免 `latest` 意外变更。

验证：

```bash
docker logs -f filix-checkout
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/order
```

### 绑定自有域名（HTTPS）

容器默认只监听本机 `3001`，对外请用反向代理并启用 HTTPS。推荐独立子域名：

```nginx
server {
    listen 443 ssl http2;
    server_name checkout.example.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }
}
```

```env
NEXTAUTH_URL=https://checkout.example.com
```

挂载到主站路径（如 `/checkout`）、本地构建镜像、升级重启等见 [完整部署指南](docs/merchant-deployment.md)。

### 安全要点

- **切勿**将环境文件或 API Secret 提交到 Git 或写入镜像
- 环境文件权限建议 `600`
- 生产务必使用 HTTPS；`NEXTAUTH_URL` 须与浏览器地址栏一致

---

## Prerequisites

- Node.js 20+
- A FilixPay backend with Checkout API enabled
- Keycloak OIDC client (for wallet / credit login)

## Quick start (development)

```bash
cp .env.example .env.local
# Edit .env.local with your FilixPay and Keycloak credentials

npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Environment variables

Copy [`.env.example`](.env.example) to `.env.local` and configure:

| Variable | Purpose |
|----------|---------|
| `FILIXPAY_BACKEND_CLIENT_ID` / `FILIXPAY_BACKEND_CLIENT_SECRET` | Server-side merchant API credentials |
| `BACKEND_API_URL` | FilixPay API base URL |
| `KEYCLOAK_*` | OIDC client for payer login |
| `NEXTAUTH_*` | NextAuth session configuration |

See `.env.example` for the full list.

## Docker（本地构建）

```bash
docker build -t filix-checkout .
docker run -d --name filix-checkout -p 3001:3001 --env-file .env.local filix-checkout
```

或使用仓库脚本：

```bash
chmod +x deploy.sh
ENV_FILE=/etc/filix-checkout/env ./deploy.sh
```

## CI / production deploy (optional)

This repo includes a GitHub Actions workflow that builds and pushes a container image to GHCR on pushes to `main`.

1. Repository **Settings → Actions → General → Workflow permissions** → **Read and write permissions**
2. If package push fails, add a classic PAT with `write:packages` as secret **`GHCR_TOKEN`**

On your server, pull and restart:

```bash
export CHECKOUT_IMAGE=ghcr.io/filixpay/filix-checkout:latest
export DEPLOY_ENV_FILE=/path/to/ghcr-deploy.env   # GHCR_USER + GHCR_TOKEN
./scripts/deploy-pull.sh
```

## Project structure

```text
src/app/api/checkout/   BFF routes proxying FilixPay APIs
src/components/checkout/  Payment UI components
src/lib/                Auth, API client, utilities
docs/                   Integration guides
```

## License

Apache-2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
