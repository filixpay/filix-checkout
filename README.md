# FilixPay Checkout - 独立域名部署收银台 (演示版)

这是一个基于 TypeScript 构建的收银台项目演示 Docker 镜像。本项目旨在展示现代化的支付集成架构与容器化部署方案。

> ⚠️ **免责声明**：本项目仅供学习和技术演示使用。代码中包含的支付逻辑未经过生产环境安全审计。请勿直接在真实生产环境中处理真实资金，作者不对任何由此产生的损失负责。

## 🚀 快速开始

无需下载源码，只需一行命令即可在本地运行体验：

### 1. 拉取镜像
```bash
docker pull ghcr.io/filixpay/filix-checkout:v1.0
```
### 2. 一键运行
```bash
docker run -d -p 3001:3001 \
  --name filix-demo \
  -e FILIXPAY_CLIENT_ID=merchant-api-22189219481889 \
  -e FILIXPAY_CLIENT_SECRET=ZGvV8gyVgAHkcvfIJkiQqt60Ct2TPTTx \
  ghcr.io/filixpay/filix-checkout:v1.0
```
### 3. 本地访问
打开浏览器访问：http://localhost:3001/checkout/order

### 4. 服务器访问
只需简单配置nginx。
```bash
    # 收银台主路径 - 使用独立端口 3001
	location /checkout {
	    proxy_pass http://127.0.0.1:3001;
	    proxy_set_header Host $host;
	    proxy_set_header X-Real-IP $remote_addr;
	    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
	    proxy_set_header X-Forwarded-Proto $scheme;
	    proxy_set_header X-Forwarded-Host $host;
	    proxy_set_header X-Forwarded-Port $server_port;
	    proxy_buffer_size 128k;
	    proxy_buffers 4 256k;
	    proxy_busy_buffers_size 256k;
	    proxy_buffering off;
	    proxy_cache off;
	    proxy_read_timeout 60s;
	    proxy_connect_timeout 60s;
	}
```
打开浏览器访问：yourdomain.com/checkout/order，即可在客户独立域名完整体验从下单到支付全流程。

