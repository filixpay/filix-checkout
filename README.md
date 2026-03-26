# Filix Checkout (演示版)

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
docker run -d -p 3001:3001 --name filix-demo ghcr.io/filixpay/filix-checkout:v1.0
```
### 3. 本地访问
打开浏览器访问：http://localhost:3001?token=5589959526295284:toqMJxXtpSSyw-CH:1774572060.4abcae1be03e7f4686f75d7cf489dc6a6feb76b770f6cc8334853a985920184e

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
按上面配置即可在独立域名下访问：https://your-domain/checkout?token=5589959526295284:toqMJxXtpSSyw-CH:1774572060.4abcae1be03e7f4686f75d7cf489dc6a6feb76b770f6cc8334853a985920184e

### 5. token 获取方法
验证阶段可注册登录 [FilixPay 跨境支付官网](https://www.filixpay.com/) ，进入订单页面创建订单，点击支付从 URL 中 copy token。实际运行时可通过 API 对接下单获取 token。
