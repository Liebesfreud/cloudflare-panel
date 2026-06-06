# 部署文档

本文档用于部署 Cloudflare Preferred Panel。项目主体是无第三方依赖的原生 Node.js 应用，Cloudflare Global API Key 只在服务端或 serverless 环境变量中读取，不会写入前端资源、Cookie、浏览器存储或接口响应。

## 运行要求

- Node.js 20 LTS 或更高版本。项目依赖 Node 原生 `fetch`、`http`、`crypto` 和 ES Module 能力，当前已在 Node.js 24.14.0 下验证。
- 一台可以访问 `https://api.cloudflare.com/client/v4` 的服务器或 Node serverless 平台。
- 面板登录信息：`USER`、`PASSWORD`、`AUTH`。
- 至少一组 Cloudflare 账号：`EMAIL1` 和 `CF_API1`。
- 建议生产环境放在 HTTPS 反向代理后，并限制后台访问来源。

## 环境变量

面板登录：

```bash
USER=admin
PASSWORD=change-this-password
AUTH=JBSWY3DPEHPK3PXP
```

`AUTH` 是 TOTP Base32 密钥。登录页面输入的是当前 6 位动态验证码，不是把 `AUTH` 原样填到浏览器。

Cloudflare 多账号：

```bash
EMAIL1=first-cloudflare@example.com
CF_API1=first-global-api-key
CF_NAME1=主账号
EMAIL2=second-cloudflare@example.com
CF_API2=second-global-api-key
CF_NAME2=备用账号
```

可继续按序增加 `EMAIL3/CF_API3`、`EMAIL4/CF_API4`。`CF_NAMEn` 可选，仅用于前端账号选择器展示。

兼容旧变量名：如果没有配置 `EMAIL1/CF_API1`，仍可用 `CLOUDFLARE_EMAIL`、`CLOUDFLARE_GLOBAL_API_KEY`、`CF_EMAIL`、`CF_GLOBAL_API_KEY`、`CLOUDFLARE_API_KEY`、`CF_API_KEY` 作为第一组账号。新部署建议使用 `EMAILn/CF_APIn`。

可选变量：

- `PORT`：本地 Node 服务端口，默认 `3000`。
- `CLOUDFLARE_API_BASE_URL`：默认 `https://api.cloudflare.com/client/v4`，仅测试或代理场景需要改。
- `CLOUDFLARE_REQUEST_TIMEOUT_MS`：Cloudflare API 请求超时，默认 `15000`。
- `SESSION_TTL_DAYS`：浏览器面板会话保留天数，最大 `30`。
- `SECURE_COOKIES`：设为 `true` 后强制会话 Cookie 带 `Secure`。`NODE_ENV=production` 时会自动启用。

## 本地部署

获取代码：

```bash
git clone https://github.com/baize-projects/network.git
cd network
cp .env.example .env
```

编辑 `.env`，至少填入：

```bash
USER=admin
PASSWORD=change-this-password
AUTH=BASE32_TOTP_SECRET
EMAIL1=first-cloudflare@example.com
CF_API1=first-global-api-key
PORT=3000
SESSION_TTL_DAYS=30
SECURE_COOKIES=false
```

启动服务：

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

## Serverless 部署

### Vercel

仓库已提供 `api/index.js` 和 `vercel.json`，可把同一套 Node API 跑在 Vercel Serverless Functions 上。

1. 在 Vercel 导入仓库。
2. 在 Project Settings -> Environment Variables 添加：
   - `USER`
   - `PASSWORD`
   - `AUTH`
   - `EMAIL1`
   - `CF_API1`
   - 可选 `CF_NAME1`、`EMAIL2`、`CF_API2`、`CF_NAME2` 等。
3. 部署完成后访问 Vercel 域名，前端和 `/api/*` 会在同一域名下工作。

### GitHub Pages

GitHub Pages 只能托管静态前端，不能执行 Cloudflare API 后端。仓库内置 `.github/workflows/publish-pages-branch.yml`，推送 `main` 后会自动：

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

Pages 页面只能用于展示前端壳子。真实 Cloudflare 管理功能必须访问部署了 Node API 的地址，或后续接入单独的 API 后端。

### Cloudflare Workers / Pages Functions

当前仓库主体是 Node HTTP runtime，不能直接作为 Cloudflare Workers 脚本运行。若要完全运行在 Cloudflare Workers 或 Pages Functions，需要新增 Fetch runtime 适配层，并确认所有 Node API 使用都兼容 Workers。环境变量命名仍应保持 `USER`、`PASSWORD`、`AUTH`、`EMAIL1`、`CF_API1`。

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

## Docker 部署

仓库提供 `Dockerfile` 和 GitHub Actions workflow：`.github/workflows/docker-image.yml`。每次推送 `main` 或推送 `v*` 标签时，Actions 会先执行语法检查和测试，再构建 `linux/amd64`、`linux/arm64` 镜像并推送到 Docker Hub。

### 配置 Docker Hub 自动构建

在 GitHub 仓库 Settings -> Secrets and variables -> Actions 中添加：

- `DOCKERHUB_USERNAME`：Docker Hub 用户名。
- `DOCKERHUB_TOKEN`：Docker Hub Access Token，建议不要使用网页登录密码。
- `DOCKERHUB_REPOSITORY`：可选，完整镜像名，例如 `baize233/network`。不填时默认使用 `DOCKERHUB_USERNAME/当前仓库名`。

未配置 `DOCKERHUB_USERNAME` 或 `DOCKERHUB_TOKEN` 时，Docker workflow 仍会运行测试和镜像构建验证，但会跳过 Docker Hub 登录和推送，并在 Actions 中输出 warning。配置 secrets 后，下一次推送会自动上传镜像。

推送成功后会生成这些标签：

- `latest`：`main` 分支最新镜像。
- `sha-<commit>`：每次提交对应镜像。
- `v*`：推送 Git tag 时生成同名版本标签。

### 本地构建镜像

```bash
docker build -t cloudflare-preferred-panel:local .
```

### docker run

先准备 `.env`，内容可参考 `.env.example`：

```bash
USER=admin
PASSWORD=change-this-password
AUTH=BASE32_TOTP_SECRET
EMAIL1=first-cloudflare@example.com
CF_API1=first-global-api-key
PORT=3000
SESSION_TTL_DAYS=30
```

生产运行：

```bash
docker run -d \
  --name cloudflare-preferred-panel \
  --restart unless-stopped \
  --env-file .env \
  -p 3000:3000 \
  baize233/network:latest
```

如果 Docker Hub 镜像名不是 `baize233/network`，把最后一行替换成你的 `DOCKERHUB_REPOSITORY:latest`。

本机 HTTP 直连调试时，如果没有 HTTPS 反向代理，可以临时覆盖：

```bash
docker run --rm \
  --env-file .env \
  -e NODE_ENV=development \
  -e SECURE_COOKIES=false \
  -p 3000:3000 \
  baize233/network:latest
```

生产环境建议保持默认 `NODE_ENV=production`，并放在 HTTPS 反向代理后面。此时会话 Cookie 会带 `Secure`，HTTP 明文访问时浏览器不会保存登录 Cookie。

### docker compose

```yaml
services:
  cloudflare-panel:
    image: baize233/network:latest
    container_name: cloudflare-preferred-panel
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "3000:3000"
```

启动：

```bash
docker compose up -d
docker compose logs -f
```

### Docker 升级

```bash
docker pull baize233/network:latest
docker stop cloudflare-preferred-panel
docker rm cloudflare-preferred-panel
docker run -d \
  --name cloudflare-preferred-panel \
  --restart unless-stopped \
  --env-file .env \
  -p 3000:3000 \
  baize233/network:latest
```

使用 compose：

```bash
docker compose pull
docker compose up -d
```

### Docker 健康检查

镜像内置 healthcheck，会请求：

```text
http://127.0.0.1:${PORT}/api/session/status
```

查看状态：

```bash
docker ps
docker inspect --format='{{json .State.Health}}' cloudflare-preferred-panel
```

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
- 未登录但已配置 `USER/PASSWORD/AUTH` 时，`loginRequired` 为 `true`、`authenticated` 为 `false`，不会返回 Cloudflare 账号列表。
- 登录后返回 `authenticated: true`、`accounts` 脱敏列表和当前 `activeCloudflareAccount`。
- 响应中不应出现 Global API Key、面板密码或 `AUTH`。
- 登录后响应头应设置 `HttpOnly`、`SameSite=Lax`、`Max-Age=2592000` 的 `cf_panel_session` Cookie。
- Cookie 值不应包含邮箱、密码、2FA 密钥或 Global API Key。

只读功能检查：

1. 打开面板首页，输入 `USER`、`PASSWORD` 和当前 2FA 验证码进入后台。
2. 进入“域名管理”，确认当前选中账号的 Zone 列表可以加载。
3. 如果配置了多个账号，使用顶部账号选择器切换，确认域名列表会刷新。
4. 点击任意域名，检查 DNS、SSL/TLS、缓存管理、防火墙、统计分析、页面规则、证书管理页面是否能打开。
5. 检查一键加速、自动优化、Workers、Pages、D1、R2、KV、Tunnels、操作历史页面是否能打开。
6. 浏览器控制台不应出现 JavaScript error。
7. 未明确授权前，不要提交新增、编辑、删除、清空缓存、部署 Worker、创建证书等真实写操作。

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

- 不要提交 `.env`、真实 Global API Key、面板密码、TOTP 密钥、私钥、证书文件或本地截图。
- Global API Key 权限很高，建议只把面板部署在可信网络或额外加访问控制。
- 浏览器只保存随机会话 ID。Cloudflare API Key、面板密码和 `AUTH` 不写入 Cookie、localStorage、sessionStorage、前端响应体或操作历史。
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

### 提示未配置面板登录

检查 `.env` 或平台环境变量是否同时填写：

```bash
USER=...
PASSWORD=...
AUTH=...
```

修改 `.env` 后需要重启 Node 进程。

### 提示缺少 Cloudflare 凭据

检查至少一组账号是否同时填写：

```bash
EMAIL1=...
CF_API1=...
```

### 前端登录后提示 Cookie 保存失败

确认：

- 浏览器允许当前站点保存 Cookie。
- 如果是生产环境或开启了 `SECURE_COOKIES=true`，必须通过 HTTPS 访问面板。
- 反向代理保留 `X-Forwarded-Proto`，并正确把 HTTPS 请求转发给 Node 服务。
- 退出登录后重新输入用户名、密码和 2FA 验证码。

### Cloudflare API 返回 403 或认证失败

确认：

- `EMAILn` 和 `CF_APIn` 属于同一个 Cloudflare 账号。
- Global API Key 没有复制多余空格。
- 账号对目标 Zone、Workers、Pages、R2、KV、D1、Tunnels 等资源有权限。

### 页面能打开但列表为空

先检查浏览器控制台和服务端日志，再直接访问：

```bash
curl http://127.0.0.1:3000/api/zones
```

如果接口返回 Cloudflare 错误，按错误信息修复账号权限或资源配置。
