# 部署文档

本文档用于把 Cloudflare Preferred Panel 部署到本地服务器或生产主机。项目是无第三方依赖的原生 Node.js 应用，Cloudflare Global API Key 只在服务端读取，不会写入前端资源或接口响应。

## 运行要求

- Node.js 20 LTS 或更高版本。项目依赖 Node 原生 `fetch`、`http` 和 ES Module 能力，当前已在 Node.js 24.14.0 下验证。
- 一台可以访问 `https://api.cloudflare.com/client/v4` 的服务器。
- Cloudflare 账号邮箱和 Global API Key。
- 建议生产环境放在 HTTPS 反向代理后，并限制后台访问来源。

## 获取代码

```bash
git clone https://github.com/baize-projects/network.git
cd network
```

如果已经部署过：

```bash
git fetch origin
git pull --ff-only origin main
```

## 配置环境变量

复制模板：

```bash
cp .env.example .env
```

编辑 `.env`：

```bash
CLOUDFLARE_EMAIL=your-cloudflare-account-email@example.com
CLOUDFLARE_GLOBAL_API_KEY=your-global-api-key
PORT=3000
SESSION_TTL_DAYS=30
SECURE_COOKIES=false
```

兼容变量名：

- `CF_EMAIL`
- `CF_GLOBAL_API_KEY`
- `CLOUDFLARE_API_KEY`
- `CF_API_KEY`

可选变量：

- `CLOUDFLARE_API_BASE_URL`：默认是 `https://api.cloudflare.com/client/v4`，仅测试或代理场景需要改。
- `CLOUDFLARE_REQUEST_TIMEOUT_MS`：Cloudflare API 请求超时，默认 `15000`。
- `SESSION_TTL_DAYS`：前端输入邮箱和 Global API Key 登录后的浏览器会话保留天数，最大 `30`。
- `SECURE_COOKIES`：设为 `true` 后强制会话 Cookie 带 `Secure`。`NODE_ENV=production` 时会自动启用。

## 本地启动

如果机器有 `npm`：

```bash
npm run dev
```

如果机器没有 `npm`，可以直接运行：

```bash
node src/server.js
```

指定端口：

```bash
PORT=3003 node src/server.js
```

打开：

```text
http://127.0.0.1:3003/
```

## 生产启动

直接启动：

```bash
NODE_ENV=production PORT=3000 node src/server.js
```

使用 `npm` 启动：

```bash
PORT=3000 npm start
```

生产环境建议使用 systemd、PM2 或其他进程管理器托管进程，保证异常退出后自动拉起。

## GitHub Pages 静态发布

仓库内置 `.github/workflows/publish-pages-branch.yml`，推送 `main` 后会自动：

1. 检查 `src`、`public`、`scripts`、`test` 下的 JavaScript 语法。
2. 运行 `node --test test/**/*.test.js`。
3. 执行 `node scripts/build-pages.js _site "$GITHUB_SHA"` 生成静态产物。
4. 把 `_site/` 强制推送到 `pages` 分支。

本地也可以生成 Pages 产物：

```bash
npm run build:pages
```

如果没有 `npm`：

```bash
node scripts/build-pages.js _site local-check
```

`scripts/build-pages.js` 会在 `_site/` 内给 HTML、JS 模块 import、CSS `@import` 和本地图片资源追加 `?v=<commit-sha>`，避免 GitHub Pages 或浏览器缓存旧 JS/CSS 导致样式、脚本不同步。

注意：GitHub Pages 只能托管静态文件。Pages 页面可用于打开前端界面和展示样式，但真实 Cloudflare 管理功能仍需要部署并访问 Node.js 后端。

## systemd 示例

假设项目部署在 `/opt/network`，Node 路径是 `/usr/bin/node`：

```ini
[Unit]
Description=Cloudflare Preferred Panel
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/network
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/opt/network/.env
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

安装并启动：

```bash
sudo cp cloudflare-panel.service /etc/systemd/system/cloudflare-panel.service
sudo systemctl daemon-reload
sudo systemctl enable --now cloudflare-panel
sudo systemctl status cloudflare-panel
```

查看日志：

```bash
journalctl -u cloudflare-panel -f
```

## Nginx 反向代理示例

```nginx
server {
    listen 80;
    server_name panel.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

生产环境请再配置 HTTPS 证书，或放在已经启用 HTTPS 的网关后面。

## 部署后健康检查

基础检查：

```bash
curl -I http://127.0.0.1:3000/
curl http://127.0.0.1:3000/api/session/status
```

预期结果：

- 首页返回 `200`。
- `/api/session/status` 返回 JSON。
- 已配置 `.env` 时，`hasCredentials` 为 `true`，`email` 为脱敏邮箱。
- 响应中不应出现 Global API Key。
- 前端输入邮箱和 Global API Key 登录后，响应头应设置 `HttpOnly`、`SameSite=Lax`、`Max-Age=2592000` 的 `cf_panel_session` Cookie。
- Cookie 值不应包含邮箱或 Global API Key。

只读功能检查：

1. 打开面板首页，使用“快速进入”或填写 Cloudflare 邮箱和 Global API Key 进入后台。
2. 进入“域名管理”，确认 Zone 列表可以加载。
3. 点击任意域名，检查 DNS、SSL/TLS、缓存管理、防火墙、统计分析、页面规则、证书管理页面是否能打开。
4. 检查一键加速、自动优化、Workers、Pages、D1、R2、KV、Tunnels、操作历史页面是否能打开。
5. 浏览器控制台不应出现 JavaScript error。
6. 未明确授权前，不要提交新增、编辑、删除、清空缓存、部署 Worker、创建证书等真实写操作。

## 升级流程

```bash
git fetch origin
git pull --ff-only origin main
node --test test/**/*.test.js
sudo systemctl restart cloudflare-panel
sudo systemctl status cloudflare-panel
```

如果当前环境没有 `npm`，测试使用 `node --test test/**/*.test.js` 即可。

## 回滚流程

查看最近提交：

```bash
git log --oneline -5
```

回到上一个已知可用版本：

```bash
git checkout <commit-sha>
sudo systemctl restart cloudflare-panel
```

确认功能恢复后，再决定是否在主分支上修复并重新部署。不要回滚 `.env` 中的真实凭据。

## 安全边界

- 不要提交 `.env`、真实 Global API Key、私钥、证书文件或本地截图。
- Global API Key 权限很高，建议只把面板部署在可信网络或额外加访问控制。
- 前端输入凭据登录时，浏览器只保存随机会话 ID。真实邮箱和 Global API Key 保存在当前 Node.js 进程内存会话中，不写入 Cookie、localStorage、前端响应体或操作历史。
- 会话 Cookie 默认 30 天过期，`SESSION_TTL_DAYS` 最大也会被限制为 30 天。Node 进程重启后，内存会话会丢失，用户需要重新登录。
- 生产环境请使用 HTTPS。`NODE_ENV=production` 或 `SECURE_COOKIES=true` 会让会话 Cookie 带 `Secure`，HTTP 明文访问时浏览器不会保存这类 Cookie。
- 面板内 DNS 删除、证书删除、Worker 部署、自动优化、一键加速等操作会影响真实 Cloudflare 资源。
- 操作历史当前保存在 Node 进程内存中，服务重启后会清空，不适合作为长期审计系统。
- 上传自定义证书、Worker Secret、Tunnel Token 等敏感数据时，服务端不应把请求体写入操作历史或日志。

## 常见问题

### 没有 npm 命令

项目没有第三方依赖，可以直接运行：

```bash
node src/server.js
```

### 端口已被占用

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
kill <pid>
```

或者换端口：

```bash
PORT=3003 node src/server.js
```

### 提示未配置凭据

检查 `.env` 是否在项目根目录，并确认同时填写：

```bash
CLOUDFLARE_EMAIL=...
CLOUDFLARE_GLOBAL_API_KEY=...
```

修改 `.env` 后需要重启 Node 进程。

### 前端输入凭据后提示 Cookie 保存失败

确认：

- 浏览器允许当前站点保存 Cookie。
- 如果是生产环境或开启了 `SECURE_COOKIES=true`，必须通过 HTTPS 访问面板。
- 反向代理保留 `X-Forwarded-Proto`，并正确把 HTTPS 请求转发给 Node 服务。
- 退出登录后重新输入邮箱和 Global API Key。

### Cloudflare API 返回 403 或认证失败

确认：

- 邮箱和 Global API Key 属于同一个 Cloudflare 账号。
- Global API Key 没有复制多余空格。
- 账号对目标 Zone、Workers、Pages、R2、KV、D1、Tunnels 等资源有权限。

### 页面能打开但列表为空

先检查浏览器控制台和服务端日志，再直接访问：

```bash
curl http://127.0.0.1:3000/api/zones
```

如果接口返回 Cloudflare 错误，按错误信息修复账号权限或资源配置。
