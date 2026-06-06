# Cloudflare Preferred Panel

一个紧凑的 Cloudflare 第三方管理面板，使用服务端代理 Cloudflare API，支持多 Cloudflare 账号切换、DNS、单域名配置、Workers、Pages、D1、R2、KV、Tunnels 和一键加速工作流。

## 功能

- 多账户管理：通过 `EMAIL1/CF_API1`、`EMAIL2/CF_API2` 等环境变量配置多个 Cloudflare 账号，登录后可在顶部切换。
- 域名管理：读取当前选中账号所有 Zone，展示域名、状态、区域 ID、套餐，并支持复制区域 ID。
- DNS 记录：读取、新增、编辑、删除常用 DNS 记录，支持 `A`、`AAAA`、`CNAME`、`TXT`、`MX`、`NS`。
- 单域名管理：提供 DNS、SSL/TLS、缓存、防火墙、统计分析、页面规则、证书管理页面。
- 一键加速：配置访问域名、源站域名、优选域名和 Cloudflare for SaaS 相关流程。
- Workers：管理 Worker 脚本、workers.dev、路由和自定义域。
- 开发资源：管理 Pages、D1 数据库、R2 存储桶、Workers KV、Cloudflare Tunnels。
- Worker 模板库：本地保存常用 Worker 脚本模板，快速带入新建 Worker 弹窗。
- 需求开发：侧栏入口直接跳转到 [GitHub Issues](https://github.com/baize-projects/network/issues/new)。

## 本地运行

复制环境变量模板：

```bash
cp .env.example .env
```

然后填写 `.env`：

```bash
USER=admin
PASSWORD=change-this-password
AUTH=JBSWY3DPEHPK3PXP
EMAIL1=first-cloudflare@example.com
CF_API1=first-global-api-key
EMAIL2=second-cloudflare@example.com
CF_API2=second-global-api-key
PORT=3000
```

`AUTH` 是 TOTP Base32 密钥，不是一次性 6 位验证码。登录页面输入的是 `USER`、`PASSWORD` 和当前 2FA 验证码；Cloudflare Global API Key 只从服务端环境变量读取。

启动服务：

```bash
npm run dev
```

如果当前机器没有 `npm`，可以直接运行：

```bash
node src/server.js
```

然后打开：

```text
http://localhost:3000
```

兼容旧变量名：如果没有配置 `EMAIL1/CF_API1`，仍可用 `CLOUDFLARE_EMAIL`、`CLOUDFLARE_GLOBAL_API_KEY`、`CF_EMAIL`、`CF_GLOBAL_API_KEY`、`CLOUDFLARE_API_KEY`、`CF_API_KEY` 作为第一组账号。

生产部署、serverless/Vercel、GitHub Pages 静态发布、systemd、Nginx、升级回滚和部署后验收流程见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## Docker

仓库提供 `Dockerfile`，并通过 GitHub Actions 自动构建和推送 Docker Hub 镜像。最简运行方式：

```bash
docker run -d \
  --name cloudflare-preferred-panel \
  --restart unless-stopped \
  --env-file .env \
  -p 3000:3000 \
  baize233/network:latest
```

如果你的 Docker Hub 镜像名不同，请替换最后一行。Docker Hub secrets、compose、升级和 HTTPS/Cookie 注意事项见 [DEPLOYMENT.md](./DEPLOYMENT.md#docker-部署)。

## 项目结构

```text
api/                                   # Vercel/Node serverless 入口
src/
  app.js                               # HTTP 应用组装
  bootstrap.js                         # 依赖组装
  server.js                            # 服务启动入口
  config/                              # 环境变量与路径配置
  controllers/                         # HTTP 控制器
  routes/                              # API 路由
  services/cloudflare/                 # Cloudflare API 客户端与业务服务
  middleware/                          # 静态资源等边界处理
  lib/                                 # 通用 HTTP 工具
public/                                # 前端静态资源
test/                                  # Node test 测试
```

## 测试

```bash
npm test
```

如果当前机器没有 `npm`，可以直接运行：

```bash
node --test test/**/*.test.js
```

## 安全说明

Cloudflare Global API Key 只在服务端读取，不会写入前端页面、Cookie、localStorage、sessionStorage、接口响应或操作历史。浏览器只保存最长 30 天的 HttpOnly 随机会话 Cookie；Cookie 内不包含邮箱、密码、2FA 密钥或 Global API Key。

请只提交 `.env.example`，不要把真实 `.env`、API Key、截图、证书私钥或本地交接文档提交到仓库。

## License

MIT
