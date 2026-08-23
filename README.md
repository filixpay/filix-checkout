# Filix Checkout

Open-source checkout frontend for [FilixPay](https://www.filixpay.com). Built with Next.js, it provides a payment UI and BFF layer that proxies FilixPay Checkout APIs (QR, wallet, crypto, bank transfer, risk resume, and more).

## Documentation

See [docs/README.md](docs/README.md) for the full index.

| Document | Description |
|----------|-------------|
| [docs/crypto-integration.md](docs/crypto-integration.md) | Self-hosted TRON-USDT (CRYPTO channel) integration |
| [docs/risk-resume-integration.md](docs/risk-resume-integration.md) | PRE_AUTH risk blocking, pending review, and USER_RESUME flow |

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

## Docker

Build and run with your own env file (no secrets are baked into the image):

```bash
docker build -t filix-checkout .
docker run -d --name filix-checkout -p 3001:3001 --env-file .env.local filix-checkout
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

Or build locally:

```bash
chmod +x deploy.sh
./deploy.sh
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
