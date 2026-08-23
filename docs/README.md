# 集成文档

面向已部署 **FilixPay 后端**的开发者与商户运维。

- **商户**：在自己的服务器部署收银台 → [merchant-deployment.md](./merchant-deployment.md)
- **开发者**：对接 Checkout API、联调具体支付通道 → 见下方指南

`filix-checkout` 作为前端收银台与 BFF，通过 Checkout API 对接 FilixPay，不直接访问 Admin、Portal 或区块链 Gateway。

## 指南

| 文档 | 说明 |
|------|------|
| [merchant-deployment.md](./merchant-deployment.md) | **商户部署**：Docker / GHCR、环境变量、Nginx 域名与路径挂载 |
| [crypto-integration.md](./crypto-integration.md) | 自托管 TRON-USDT（CRYPTO）支付：API 契约、前端行为、联调清单 |
| [risk-resume-integration.md](./risk-resume-integration.md) | PRE_AUTH 风控拦截、待审核、USER_RESUME 续跑 |

## 环境配置

复制仓库根目录 [`.env.example`](../.env.example) 为 `.env.local`，至少配置：

- `BACKEND_API_URL` — FilixPay API 基址
- `FILIXPAY_BACKEND_CLIENT_ID` / `FILIXPAY_BACKEND_CLIENT_SECRET` — 服务端凭证
- `KEYCLOAK_*` / `NEXTAUTH_*` — 钱包与信用支付登录

## 本地运行

```bash
npm install
npm run dev
```

默认 [http://localhost:3001](http://localhost:3001)。

## 贡献

欢迎 Issue 与 Pull Request。后端 API 变更请参考 [FilixPay 官方文档](https://www.filixpay.com) 或联系 FilixPay 支持。
