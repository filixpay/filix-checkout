# [FilixPay](https://www.filixpay.com "FilixPay 跨境支付官网") Checkout - 独立域名部署收银台 (演示版)

### 方案介绍

FilixPay Checkout 是一套面向**无技术开发能力的中小商家**的“开箱即用”收银台解决方案。商家只需在 [FilixPay.com](https://filixpay.com) 开通 SARs 服务并完成商户配置，即可通过 Docker 一键部署收银台镜像，将其嵌入自有官网域名下，快速实现从下单、支付到结果回跳的完整收款流程，无需任何代码开发或复杂系统对接。

---

### 两点总结

**极低技术门槛，真正“零代码”部署**  
商家无需具备编程或系统集成能力，仅通过 Docker 镜像运行一条命令，配合 Nginx 反向代理，即可将完整收银台挂载至自有域名下，实现独立域名的支付页面呈现与全流程闭环。

**依托 SARs 服务，聚焦商户核心配置**  
所有支付能力、资金处理与风控均由 [FilixPay.com](https://filixpay.com) 的 SARs 服务提供，商家只需在平台完成注册、开通服务并配置收款方式，收银台自动继承其设置，无需关心底层支付通道对接，极大降低了合规与安全运维的复杂度。

> ⚠️ **免责声明**：本项目仅供学习和技术演示使用。请勿直接在真实生产环境中使用参数变量，作者不对任何由此产生的损失负责。

##  快速开始

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
商户自己的 FILIXPAY_CLIENT_ID 和 FILIXPAY_CLIENT_SECRET 需要在 [FilixPay](https://www.filixpay.com/zh/dashboard/developer "FilixPay 开发者中心") 商户中心 - 开发者中心获取。
<img width="1597" height="588" alt="image" src="https://github.com/user-attachments/assets/24f5c775-5630-4188-a702-67ba7db03eb3" />

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

