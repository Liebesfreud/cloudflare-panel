# Cloudflare Preferred Panel

一个紧凑的 Cloudflare 第三方管理面板，使用服务端代理 Cloudflare API，支持 DNS、单域名配置、Workers、Pages、D1、R2、KV、Tunnels 和一键加速工作流。

## 功能

- 域名管理：读取当前账号所有 Zone，展示域名、状态、区域 ID、套餐，并支持复制区域 ID。
- DNS 记录：读取、新增、编辑、删除常用 DNS 记录，支持 `A`、`AAAA`、`CNAME`、`TXT`、`MX`、`NS`。
- 单域名管理：提供 DNS、SSL/TLS、缓存、防火墙、统计分析、页面规则、证书管理页面。
- 一键加速：配置访问域名、源站域名、优选域名和 Cloudflare for SaaS 相关流程。
- Workers：管理 Worker 脚本、workers.dev、路由和自定义域。
- 开发资源：管理 Pages、D1 数据库、R2 存储桶、Workers KV、Cloudflare Tunnels。
- Worker 模板库：本地保存常用 Worker 脚本模板，快速带入新建 Worker 弹窗。
- 需求开发：侧栏入口直接跳转到 [GitHub Issues](https://github.com/baize-projects/network/issues/new)。

## 运行

复制环境变量模板：

```bash
cp .env.example .env
```

然后填写 `.env`：

```bash
CLOUDFLARE_EMAIL=your-cloudflare-account-email@example.com
CLOUDFLARE_GLOBAL_API_KEY=your-global-api-key
PORT=3000
```

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

也可以使用兼容变量名：`CF_EMAIL`、`CF_GLOBAL_API_KEY`、`CLOUDFLARE_API_KEY`、`CF_API_KEY`。

生产部署、systemd、Nginx、升级回滚和部署后验收流程见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

## 项目结构

```text
src/
  app.js                                # HTTP 应用组装
  bootstrap.js                          # 依赖组装
  server.js                             # 服务启动入口
  config/                               # 环境变量与路径配置
  controllers/                          # HTTP 控制器
  routes/                               # API 路由
  services/cloudflare/                  # Cloudflare API 客户端与业务服务
  middleware/                           # 静态资源等边界处理
  lib/                                  # 通用 HTTP 工具
public/                                 # 前端静态资源
test/                                   # Node test 测试
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

Cloudflare Global API Key 只在服务端读取，不会写入前端页面或浏览器接口响应。用户通过前端输入邮箱和 Global API Key 登录时，浏览器只保存 30 天 HttpOnly 会话 Cookie，Cookie 内不包含邮箱或 Key；真实 Key 只保存在当前 Node.js 进程内存会话中，退出或服务重启后会失效。

请只提交 `.env.example`，不要把真实 `.env`、API Key、截图或本地交接文档提交到仓库。

## License

MIT
