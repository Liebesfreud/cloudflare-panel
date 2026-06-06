# Cloudflare Preferred Panel

一个 Docker-only 的 Cloudflare 第三方管理面板。面板通过服务端代理 Cloudflare API，支持多 Cloudflare 账号切换、DNS、单域名配置、Workers、Pages、D1、R2、KV、Tunnels 和一键加速工作流。

## 功能

- 首次初始化：第一次打开 `ip:端口` 时必须输入容器启动日志中的一次性初始化口令，再创建管理员账户并强制绑定 2FA。
- SQLite 持久化：管理员密码使用 scrypt 哈希保存；2FA 密钥和 Cloudflare Global API Key 使用 AES-GCM 加密后保存到 SQLite。
- 多账户管理：Cloudflare 账号保存在 SQLite，登录后可在顶部切换。
- 域名管理：读取当前账号所有 Zone，展示域名、状态、区域 ID、套餐，并支持新增 Zone。
- DNS 记录：读取、新增、编辑、删除和批量管理常用 DNS 记录。
- 单域名管理：提供 DNS、SSL/TLS、缓存、防火墙、统计分析、页面规则、证书管理页面。
- 一键加速：配置访问域名、源站域名、优选域名和 Cloudflare for SaaS 相关流程。
- Workers 与开发资源：管理 Workers、Pages、D1、R2、KV、Cloudflare Tunnels 和 Worker 模板库。
- 操作历史：记录管理操作结果，不记录请求体、密码、2FA 密钥或 Global API Key。

## Docker 运行

```bash
docker run -d \
  --name cloudflare-preferred-panel \
  --restart unless-stopped \
  -p 3000:3000 \
  -v cloudflare-panel-data:/data \
  baize233/network:latest
```

然后打开：

```text
http://服务器IP:3000
```

首次打开会进入两页初始化流程：

1. 查看容器日志中的 `Initial setup token`。
2. 在第 1 页输入初始化口令，生成并保存 2FA 登录密钥到身份验证器。
3. 创建管理员用户名和密码，输入当前 6 位 2FA 验证码确认绑定。
4. 在第 2 页录入一个或多个 Cloudflare 账号名称、登录邮箱和 Global API Key。
5. 保存后进入管理面板，后续可在顶部切换当前 Cloudflare 账号。

不再通过 `.env`、`USER/PASSWORD/AUTH`、`EMAILn/CF_APIn` 配置敏感信息。

## 可选环境变量

`.env.example` 只保留非敏感运行参数：

```bash
PORT=3000
DATA_DIR=/data
SESSION_TTL_DAYS=30
SECURE_COOKIES=false
CLOUDFLARE_REQUEST_TIMEOUT_MS=15000
ENABLE_D1_SQL_CONSOLE=false
```

使用 `.env` 时：

```bash
docker run -d \
  --name cloudflare-preferred-panel \
  --restart unless-stopped \
  --env-file .env \
  -p 3000:3000 \
  -v cloudflare-panel-data:/data \
  baize233/network:latest
```

## 项目结构

```text
src/
  app.js                               # HTTP 应用组装
  bootstrap.js                         # 依赖组装
  server.js                            # 服务启动入口
  config/                              # 非敏感运行配置
  controllers/                         # HTTP 控制器
  routes/                              # API 路由
  services/                            # 鉴权、SQLite、Cloudflare 服务
  middleware/                          # 静态资源等边界处理
  lib/                                 # 通用 HTTP 工具
public/                                # 前端静态资源
test/                                  # Node test 测试
```

## 测试

```bash
node --test test/**/*.test.js
```

## 安全说明

浏览器只保存最长 30 天的 HttpOnly 随机会话 Cookie。所有状态修改接口要求 CSRF token；静态页和 JSON 响应带 CSP、`X-Frame-Options`、`nosniff` 等安全头。Cookie、localStorage、sessionStorage、接口响应和操作历史都不保存 Cloudflare Global API Key、管理员密码或 2FA 密钥。

`/data/secret.key` 是 SQLite 敏感字段加密密钥，必须和 `/data/panel.sqlite` 一起备份；只泄露 SQLite 文件时无法直接读出 2FA seed 或 Cloudflare Global API Key。

生产环境建议放在 HTTPS 反向代理后，并挂载 `/data` 做持久化备份。完整 Docker 部署、升级、备份和回滚流程见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## License

MIT
