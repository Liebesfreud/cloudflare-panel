# Docker 部署文档

本项目只保留 Docker 部署方式。面板敏感信息不再通过环境变量配置；第一次打开 `ip:端口` 时必须输入容器启动日志中的一次性初始化口令，再创建管理员账户、强制绑定 2FA，并在第二页录入一个或多个 Cloudflare 账号。数据持久化到 SQLite，默认路径为 `/data/panel.sqlite`；2FA seed 和 Cloudflare Global API Key 使用 `/data/secret.key` 派生密钥加密落盘。

## 运行要求

- Docker Engine 或兼容运行时。
- 宿主机能访问 `https://api.cloudflare.com/client/v4`。
- 生产环境建议放在 HTTPS 反向代理后。
- 必须挂载 `/data`，否则容器重建后初始化账户和 Cloudflare 账号会丢失。

## 快速运行

```bash
docker run -d \
  --name cloudflare-preferred-panel \
  --restart unless-stopped \
  -p 3000:3000 \
  -v cloudflare-panel-data:/data \
  baize233/network:latest
```

打开：

```text
http://服务器IP:3000
```

首次初始化分两页完成：

1. 运行 `docker compose logs -f` 或 `docker logs cloudflare-preferred-panel` 查看 `Initial setup token`。
2. 第 1 页输入初始化口令。
3. 生成 2FA 登录密钥，复制到身份验证器。
4. 输入管理员用户名、密码、确认密码和当前 6 位 2FA 验证码，创建管理员并进入下一步。
5. 第 2 页录入一个或多个 Cloudflare 账号名称、登录邮箱和 Global API Key。
6. 保存后浏览器继续使用 HttpOnly 会话 Cookie，进入管理面板。

## 可选运行参数

只允许通过环境变量配置非敏感运行参数：

```bash
PORT=3000
DATA_DIR=/data
SESSION_TTL_DAYS=30
SECURE_COOKIES=false
CLOUDFLARE_REQUEST_TIMEOUT_MS=15000
ENABLE_D1_SQL_CONSOLE=false
# CLOUDFLARE_API_BASE_URL=https://api.cloudflare.com/client/v4
```

不要再设置 `USER`、`PASSWORD`、`AUTH`、`EMAIL1`、`CF_API1` 等敏感环境变量。它们已经不被应用读取。

## docker compose

```yaml
services:
  cloudflare-panel:
    image: baize233/network:latest
    container_name: cloudflare-preferred-panel
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - cloudflare-panel-data:/data
    environment:
      PORT: "3000"
      DATA_DIR: /data
      SESSION_TTL_DAYS: "30"
      SECURE_COOKIES: "false"
      ENABLE_D1_SQL_CONSOLE: "false"

volumes:
  cloudflare-panel-data:
```

启动：

```bash
docker compose up -d
docker compose logs -f
```

## HTTPS 与 Cookie

`NODE_ENV=production` 时会话 Cookie 默认带 `Secure`。如果直接用 HTTP 访问生产容器，浏览器可能无法保存登录 Cookie。

推荐做法：

- 生产环境：放在 HTTPS 反向代理后，保持默认安全 Cookie。
- 本机调试：显式设置 `SECURE_COOKIES=false`。

Nginx 示例：

```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## 备份与恢复

备份 SQLite 数据和加密密钥：

```bash
docker run --rm \
  -v cloudflare-panel-data:/data \
  -v "$PWD":/backup \
  alpine sh -c 'cp /data/panel.sqlite /backup/panel.sqlite.backup && cp /data/secret.key /backup/secret.key.backup'
```

恢复前先停止容器，并同时恢复 SQLite 与加密密钥：

```bash
docker stop cloudflare-preferred-panel
docker run --rm \
  -v cloudflare-panel-data:/data \
  -v "$PWD":/backup \
  alpine sh -c 'cp /backup/panel.sqlite.backup /data/panel.sqlite && cp /backup/secret.key.backup /data/secret.key'
docker start cloudflare-preferred-panel
```

## 升级

```bash
docker pull baize233/network:latest
docker stop cloudflare-preferred-panel
docker rm cloudflare-preferred-panel
docker run -d \
  --name cloudflare-preferred-panel \
  --restart unless-stopped \
  -p 3000:3000 \
  -v cloudflare-panel-data:/data \
  baize233/network:latest
```

Compose：

```bash
docker compose pull
docker compose up -d
```

## Docker Hub 自动构建

仓库保留 `.github/workflows/docker-image.yml`。每次推送 `main` 或 `v*` tag 时，workflow 会：

1. 检查 JavaScript 语法。
2. 运行 `node --test test/**/*.test.js`。
3. 构建 `linux/amd64` 和 `linux/arm64` Docker 镜像。
4. 如果配置了 Docker Hub secrets，则推送镜像。

需要在 GitHub Actions Secrets 配置：

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN`
- `DOCKERHUB_REPOSITORY`，可选，例如 `baize233/network`

未配置 Docker Hub secrets 时，workflow 仍会测试和构建镜像，但跳过推送。

## 安全检查

- 不提交真实 SQLite 数据库、截图、私钥、证书、Cloudflare Global API Key 或管理员密码。
- 未完成首次初始化前，`/api/setup/secret` 和管理员创建接口必须校验容器日志中的一次性初始化口令。
- 2FA seed 和 Cloudflare Global API Key 使用 AES-GCM 加密后落 SQLite；`/data/secret.key` 泄露等级等同密钥材料。
- 浏览器 Cookie 只保存随机 session id；状态修改接口要求 CSRF token，并做同源来源校验。
- 静态页和 JSON 响应带 CSP、`X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`、`Referrer-Policy` 等安全响应头。
- 操作历史不记录请求体，不保存密码、2FA 密钥或 Global API Key。
- D1 SQL 控制台默认关闭，只有设置 `ENABLE_D1_SQL_CONSOLE=true` 后才允许执行任意 SQL。
- `/data/panel.sqlite` 和 `/data/secret.key` 应纳入服务器备份策略，并限制宿主机文件访问权限。

## 验收

部署后建议逐项检查：

1. 首次打开 `http://服务器IP:端口` 能进入初始化页。
2. 未初始化时访问 `/api/zones` 返回“请先完成首次初始化”。
3. 没有初始化口令时不能获取 2FA seed。
4. 初始化必须输入 2FA 当前验证码。
5. 第 2 页默认显示多行 Cloudflare 账号输入，只填有效账号行即可保存。
6. 初始化完成后能列出 Cloudflare 域名。
7. 不带 CSRF token 的已登录写操作返回 403。
8. 重新创建容器并挂载同一个 volume 后，不再要求重新初始化。
9. 清理浏览器 Cookie 后访问后台需要重新登录。
