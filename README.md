# FilixPay Checkout

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/filixpay/filix-checkout?style=social)](https://github.com/filixpay/filix-checkout/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/filixpay/filix-checkout)](https://github.com/filixpay/filix-checkout/issues)

Open-source payment checkout for modern commerce, built for secure and flexible payment flows with FilixPay.

FilixPay Checkout provides the customer-facing checkout experience for commerce applications integrating with FilixPay payment infrastructure.

[Website](https://www.filixpay.com) · [Merchant deployment guide](docs/merchant-deployment.md) · [Issues](https://github.com/filixpay/filix-checkout/issues)

## Features

- Payment checkout
- Commerce checkout flows
- Secure payment experience
- Global payment infrastructure
- Modern TypeScript stack
- Designed for integration with FilixPay
- Open source (Apache-2.0)

## Architecture

```text
Commerce Storefront
        │
        ▼
FilixPay Checkout
        │
        ▼
FilixPay Payment Infrastructure
        │
        ├── Payment Routing
        ├── Payment Runtime
        └── Payment Providers
```

FilixPay Checkout focuses on the checkout experience and integration boundary. Payment execution and accounting remain part of the FilixPay payment infrastructure.

## Getting Started

```bash
cp .env.example .env.local
# Edit .env.local with your FilixPay and Keycloak credentials

npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

See [docs/merchant-deployment.md](docs/merchant-deployment.md) for configuration and integration details.

## Part of FilixPay

| Project | Role |
|---------|------|
| **[Merchant Portal](https://github.com/filixpay/filix-merchant)** | Merchant and commerce operations |
| **[Checkout](https://github.com/filixpay/filix-checkout)** | Customer-facing payment checkout |
| **[Saleor Integration](https://github.com/filixpay/filixpay-saleor)** | Payment integration for Saleor Commerce |

---

## Merchant self-hosted deploy (summary)

This repository is an open-source checkout frontend (Next.js + BFF). After you self-host it, the payment pages and API proxy run on **your own domain/server**. FilixPay payment capabilities connect through the Checkout API; core risk and channel logic stay on the FilixPay backend. **No code changes required** — deploy with a Docker image and environment variables.

本仓库是开源收银台前端（Next.js + BFF）。商户自行托管后，付款页面与 API 代理运行在**您自己的域名/服务器**上；FilixPay 支付能力通过 Checkout API 对接，核心风控与渠道逻辑仍由 FilixPay 后端处理。**无需改代码**，通过 Docker 镜像 + 环境变量即可部署。

> Full steps, path mounts, upgrades, and FAQ: [docs/merchant-deployment.md](docs/merchant-deployment.md).

### Why self-host?

- **Brand & domain** — checkout on `checkout.yourdomain.com`
- **Clear compliance boundary** — frontend, logs, and deploy environment on your infrastructure
- **Auditable** — Apache-2.0, no black-box pages
- **Low integration cost** — env-driven; GHCR image pull supported

### Prerequisites

| Item | Notes |
|------|--------|
| FilixPay merchant account | Payment methods configured |
| API credentials | `FILIXPAY_BACKEND_CLIENT_ID` / `FILIXPAY_BACKEND_CLIENT_SECRET` |
| OIDC client (optional) | Wallet / credit login via `KEYCLOAK_*` + `NEXTAUTH_*` |
| Server | Linux host with Docker |
| Domain + HTTPS (recommended) | Reverse proxy (Nginx/Caddy) |

### Pull GHCR image

```bash
cp .env.example /etc/filix-checkout/env
# Edit env: FILIXPAY_*, BACKEND_API_URL, NEXTAUTH_URL, NEXTAUTH_SECRET
chmod 600 /etc/filix-checkout/env

docker pull ghcr.io/filixpay/filix-checkout:latest

docker run -d \
  --name filix-checkout \
  --restart unless-stopped \
  -p 127.0.0.1:3001:3001 \
  --env-file /etc/filix-checkout/env \
  ghcr.io/filixpay/filix-checkout:latest
```

Pin a version tag in production (avoid unexpected `latest` changes).

### Environment variables

See [`.env.example`](.env.example):

| Variable | Purpose |
|----------|---------|
| `FILIXPAY_BACKEND_CLIENT_ID` / `FILIXPAY_BACKEND_CLIENT_SECRET` | Server-side merchant API credentials |
| `BACKEND_API_URL` | FilixPay API base URL |
| `KEYCLOAK_*` | OIDC client for payer login |
| `NEXTAUTH_*` | NextAuth session configuration |

### Docker (local build)

```bash
docker build -t filix-checkout .
docker run -d --name filix-checkout -p 3001:3001 --env-file .env.local filix-checkout
```

Or:

```bash
chmod +x deploy.sh
ENV_FILE=/etc/filix-checkout/env ./deploy.sh
```

### Project structure

```text
src/app/api/checkout/     BFF routes proxying FilixPay APIs
src/components/checkout/  Payment UI components
src/lib/                  Auth, API client, utilities
docs/                     Integration guides
```

## License

Apache-2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).
