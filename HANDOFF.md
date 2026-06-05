# Cloudflare 优选面板交接文档

## 当前状态

项目是一个无第三方依赖的标准 Node.js Web 项目，服务端使用 Node 原生 `http` 模块，前端使用原生 HTML/CSS/JavaScript。Cloudflare 凭据只从服务端环境变量读取，不会暴露到浏览器。

已完成能力：

- 域名管理：读取当前账号所有 Cloudflare Zone。
- DNS 记录管理：点击域名进入对应 Zone 的 DNS 记录页，支持读取、新增、编辑、删除 DNS 记录。
- 支持记录类型：`A`、`AAAA`、`CNAME`、`TXT`、`MX`、`NS`。
- A/AAAA/CNAME 支持 Cloudflare 代理开关，MX 支持优先级。

## 运行方式

项目根目录创建 `.env`：

```bash
CLOUDFLARE_EMAIL="Cloudflare 账号邮箱"
CLOUDFLARE_GLOBAL_API_KEY="Global API Key"
PORT=3000
```

启动：

```bash
node src/server.js
```

访问：

```text
http://localhost:3000
```

## 目录结构

```text
src/
  app.js                                # HTTP 应用组装
  bootstrap.js                          # 依赖装配
  server.js                             # 服务启动入口
  config/                               # 环境变量与路径
  controllers/                          # HTTP 控制器
  routes/                               # API 路由
  services/cloudflare/                  # Cloudflare API 封装和业务服务
  middleware/                           # 静态资源服务
  lib/                                  # 通用工具
public/                                 # 前端页面
test/                                   # Node test smoke 测试
```

## API

- `GET /api/zones`
  - 返回当前账号所有 Zone。
- `GET /api/zones/:zoneId/dns-records`
  - 返回指定 Zone 的 DNS 记录。
- `POST /api/zones/:zoneId/dns-records`
  - 新增 DNS 记录。
- `PATCH /api/zones/:zoneId/dns-records/:recordId`
  - 更新 DNS 记录。
- `DELETE /api/zones/:zoneId/dns-records/:recordId`
  - 删除 DNS 记录。

## Cloudflare API 对应关系

- `GET /zones`
- `GET /zones/{zone_id}/dns_records`
- `POST /zones/{zone_id}/dns_records`
- `PATCH /zones/{zone_id}/dns_records/{dns_record_id}`
- `DELETE /zones/{zone_id}/dns_records/{dns_record_id}`

认证使用 Global API Key：

- `X-Auth-Email`
- `X-Auth-Key`

## 测试

```bash
node --test test/**/*.test.js
```

测试使用本地 mock Cloudflare API，不会操作真实账号。

## 注意事项

- `.env` 已在 `.gitignore` 中，真实 Global API Key 不应提交。
- DNS 删除是真实破坏性操作，前端已加 `confirm` 二次确认。
- 当前批量添加和批量删除只是视觉壳子，未接真实功能。
- 当前 DNS 表单只覆盖常用记录字段，后续如需 SRV、CAA、HTTPS、SVCB 等类型，需要扩展 `dns-records-service.js` 的白名单和表单字段。
- Cloudflare 对部分记录类型有互斥规则，例如同名 CNAME 与其他记录冲突，这类错误由 Cloudflare API 返回并透传给前端。

## 2026-06-04 前端模块化与 DNS 表单检查点

本次继续按“标准 Node.js 项目 + 逐功能迭代”的方向整理前端，重点是减少单文件负担并让 DNS 编辑界面更贴近截图中的大表单样式。

新增/调整：

- `public/app.js` 改为薄入口，实际逻辑拆入 `public/js/`。
- 前端状态、API、路由、事件、视图拆分为独立模块：
  - `public/js/state.js`
  - `public/js/api.js`
  - `public/js/router.js`
  - `public/js/actions.js`
  - `public/js/actions/`
  - `public/js/forms/`
  - `public/js/events.js`
  - `public/js/views/`
- 样式拆分为：
  - `public/css/base.css`
  - `public/css/layout.css`
  - `public/css/components.css`
  - `public/css/components/`
  - `public/css/domains.css`
  - `public/css/dns.css`
  - `public/css/dns/`
  - `public/css/responsive.css`
- 修复域名列表行内复制按钮的多余闭合标签，避免 DOM 结构异常。
- DNS 页现在默认显示“添加 DNS 记录”大卡片，不再需要先点按钮展开。
- DNS 表单按记录类型动态切换名称/内容 placeholder 和帮助文案。
- TTL 改为标准下拉选项，MX 优先级只在 MX 类型启用，A/AAAA/CNAME 保留 Cloudflare 代理开关。
- 编辑 DNS 记录时复用同一个大表单，按钮文案切换为“保存记录”，并提供“取消编辑/放弃修改”。

验证：

```bash
find public/js src test -name '*.js' -print -exec node --check {} \;
node --test test/**/*.test.js
```

验证结果：JS 语法检查通过，Node smoke 测试 3 项全部通过。

文件体积状态：

- `public/app.js` 仅保留入口导入。
- 前端动作层按域名、DNS、通知拆分，`public/js/actions.js` 仅负责组合。
- DNS 表单状态读取单独放入 `public/js/forms/dns-form.js`。
- 通用组件样式与 DNS 页样式已拆成子目录，避免单个 CSS 文件继续膨胀。

浏览器实测：

- 本地服务：`http://localhost:3000`
- 真实账号域名列表可加载。
- 点击 `100222.xyz` 可进入 DNS 记录页。
- DNS 页显示域名摘要、添加记录大表单和 18 条 DNS 记录。
- 切换记录类型验证：
  - `MX`：优先级启用，Cloudflare 代理禁用。
  - `TXT`：优先级禁用，Cloudflare 代理禁用。
- 点击第一条 DNS 记录的编辑按钮后，表单切换为“编辑 DNS 记录”，字段正确回填，主按钮切换为“保存记录”。
- 浏览器控制台无错误。
- 未提交新增、编辑、删除请求，未改动真实 Cloudflare DNS 数据。
- 验证截图：`cloudflare-dns-panel-verified.png`

后续建议：

- 下一步如要做截图中的“多 IP 批量优选解析”，建议先扩展后端 create 接口的批量语义，再让 A/AAAA 内容框支持按空格、逗号、换行拆分，避免前端显示支持但实际只创建一条。
- 批量添加、批量删除目前仍是视觉壳子，接功能前需要补 mock API 测试和真实账号只读/非破坏性验证策略。

## 2026-06-04 单域名管理检查点

本次按截图补了“单个域名管理”层级。域名列表进入详情后，不再只有 DNS 一个孤立页面，而是统一进入 `#/zones/:zoneId/:section` 路由下的单域名管理容器。

新增/调整：

- 新增 `public/js/views/zone-view.js` 作为单域名详情容器。
- 新增 `public/js/views/zone-settings-view.js`，用于 SSL/TLS、缓存、防火墙、统计分析、页面规则、证书管理等子页面壳子。
- 路由扩展为：
  - `#/zones/:zoneId/dns`
  - `#/zones/:zoneId/ssl`
  - `#/zones/:zoneId/cache`
  - `#/zones/:zoneId/firewall`
  - `#/zones/:zoneId/analytics`
  - `#/zones/:zoneId/rules`
  - `#/zones/:zoneId/certificates`
- 左侧侧栏新增当前域名的二级菜单，并把全局菜单设置为可滚动，保证单域名菜单固定可见。
- DNS 子页调整为截图风格：
  - 顶部域名摘要卡片。
  - “添加 DNS 记录 / 批量添加 DNS 记录”工具栏。
  - 添加表单改为点击按钮后展开。
  - DNS 表格改为更大的行卡片、代理状态圆点、复制内容按钮、编辑/删除按钮。
- SSL/TLS 子页新增管理壳子：
  - SSL/TLS 加密模式选项。
  - 边缘证书状态。
  - HTTPS 重定向、自动 HTTPS 重写、HSTS、TLS 1.3、WebSockets 等开关视觉。
- 仅新增页面壳子和前端导航，未接入 Cloudflare SSL/TLS、缓存、防火墙等写接口。

验证：

```bash
find public/js src test -name '*.js' -print -exec node --check {} \;
node --test test/**/*.test.js
```

验证结果：JS 语法检查通过，Node smoke 测试 3 项全部通过。

浏览器实测：

- 本地服务：`http://localhost:3000`
- DNS 子页：`#/zones/d5e960edf95175e6f3a03f51495ff495/dns`
  - 标题为 `DNS 记录管理`。
  - 左侧二级菜单显示 `DNS 记录`、`SSL/TLS`、`缓存管理`、`防火墙`、`统计分析`、`页面规则`、`证书管理`。
  - 当前域名显示 `100222.xyz`。
  - 真实 DNS 记录显示 18 条。
  - 点击“添加 DNS 记录”会展开表单，但未提交真实新增请求。
- SSL/TLS 子页：`#/zones/d5e960edf95175e6f3a03f51495ff495/ssl`
  - 标题为 `SSL/TLS 管理`。
  - 左侧 `SSL/TLS` 菜单高亮。
  - 页面显示 9 个设置卡片和 4 个 SSL/TLS 模式选项。
- 浏览器控制台无错误。
- 未提交新增、编辑、删除请求，未改动真实 Cloudflare DNS 或 SSL/TLS 配置。
- 验证截图：
  - `cloudflare-single-zone-dns.png`
  - `cloudflare-single-zone-ssl.png`

## 2026-06-04 cococ.co 仿站壳子与凭据入口检查点

本次按 `https://cococ.co` 的当前线上首屏和后台导航结构做仿制，但安全边界保持本项目的服务端代理设计：Cloudflare Global API Key 不写入前端，也不通过接口响应返回。

新增/调整：

- 首页改为“连接您的 Cloudflare 账号”入口，视觉结构参考 cococ.co：
  - 顶部 `蜘蛛网络` 品牌条。
  - 中间 Cloudflare 凭据卡片。
  - “验证并进入管理后台”按钮。
  - 本地服务端已配置凭据时显示脱敏邮箱和“快速进入”。
- 新增本地素材：
  - `public/assets/spider-icon.png`
- 新增服务端凭据会话接口：
  - `GET /api/session/status`
  - `POST /api/session/connect`
- 凭据接口只返回：
  - `hasCredentials`
  - 脱敏后的 `email`
  - 不返回 Global API Key。
- `POST /api/session/connect` 支持两种方式：
  - 表单同时提交邮箱和 Global API Key，写入当前 Node 进程内存。
  - 表单为空时复用 `.env` 中的服务端凭据。
  - 半填邮箱或半填 Key 会返回 400，避免把表单输入和服务端密钥混用。
- 后台壳子改成 cococ.co 风格的左侧全局导航，保留当前已接入的“域名管理”和“单域名管理”。
- 其它全局模块先做仿站壳子：
  - 一键加速
  - SaaS优选
  - 免费域名
  - 自动优化
  - 操作历史
  - Workers
  - Pages
  - D1 数据库
  - R2 存储桶
  - Workers KV
  - Worker 模板库
  - Cloudflare Tunnels
  - 需求开发
- 新增样式拆分：
  - `public/css/connect.css`
  - `public/css/features.css`
  - `public/css/zone/firewall.css`
- 补齐之前 `public/css/zone.css` 引用的 `firewall.css`，避免浏览器 404。
- `public/index.html` 标题和 favicon 改为 `蜘蛛网络 - Cloudflare第三方平台管理工具`。
- 左侧导航现在可点击并高亮当前全局模块。
- 移动端补了连接页、功能壳子、防火墙表单和缓存选项的响应式约束。

验证：

```bash
find public/js src test -name '*.js' -print -exec node --check {} \;
node --test test/**/*.test.js
```

验证结果：

- JS 语法检查通过。
- Node smoke 测试 6 项全部通过。
- 新增测试覆盖凭据状态/连接接口不会暴露 Global API Key，并覆盖半填凭据的 400 边界。

浏览器实测：

- 当前版本服务启动在：`http://localhost:3001`
- `http://localhost:3000` 已有旧 Node 进程占用，本次未强杀旧进程，改用 `3001` 验证。
- 连接页显示：
  - `蜘蛛网络`
  - `连接您的 Cloudflare 账号`
  - `Cloudflare 凭据`
  - 脱敏邮箱和“快速进入”
- 点击“快速进入”后真实读取 Cloudflare 域名列表成功。
- 后台域名列表显示 10 个 Zone。
- 点击“一键加速”显示仿站后台壳子，左侧菜单高亮正确，控制台无错误。
- 点击第一个域名 `100222.xyz` 进入 DNS 子页成功：
  - 左侧出现单域名二级菜单。
  - DNS 记录加载成功，显示 18 条。
  - 控制台无错误。
- 未提交新增、编辑、删除、缓存清理或防火墙写请求；未改动真实 Cloudflare 配置。

后续建议：

- 下一步如继续“完全照着 cococ.co”接功能，建议优先接“一键加速”真实后端语义，先定义 Worker/DNS/缓存写入的事务边界和失败回滚策略。
- 当前全局模块除“域名管理”外是仿站壳子，真实写接口接入前需要为每个模块单独补 Cloudflare mock 测试。
- 若要长期在 `3000` 运行，需先停止旧版本 Node 进程，再用当前代码启动。

## 2026-06-04 统计分析真实接入检查点

本次把“统计分析”从单域名管理里的静态占位页改成真实可用模块。Cloudflare 旧 REST Zone Analytics API 已返回下线提示，当前实现改用 Cloudflare GraphQL API 的 `httpRequests1dGroups` 读取最近 7 天统计。

新增/调整：

- 新增后端只读统计链路：
  - `src/services/cloudflare/analytics-service.js`
  - `src/controllers/analytics-controller.js`
  - `GET /api/zones/:zoneId/analytics`
- `CloudflareClient` 新增 `graphql(query, variables)` 方法：
  - 复用 Global API Key 认证头。
  - 统一处理 GraphQL `errors`。
  - 不向浏览器返回 Cloudflare Global API Key。
- 统计服务当前聚合：
  - 请求数
  - 带宽
  - 缓存命中率
  - HTTPS 请求占比
  - 威胁拦截
  - 独立访客
  - 最近 7 天请求趋势
  - 访问国家/地区排行
  - 响应状态码排行
  - 内容类型排行
- 新增前端统计模块：
  - `public/js/actions/analytics-actions.js`
  - `public/js/views/zone/analytics-view.js`
  - `public/css/zone/analytics.css`
- `public/js/views/zone-settings-view.js` 现在会把 `analytics` 路由分发到真实统计页，不再走 `static-settings-view.js` 的占位卡片。
- `public/js/actions.js` 统一了单域名子页面刷新逻辑，`统计分析` 页面点击刷新会重新拉取 GraphQL 统计。
- `public/css/responsive.css` 补了统计指标卡、排行列表和趋势条在移动端的响应式约束。

新增测试：

- `test/smoke.test.js` 新增 `reads zone analytics through Cloudflare GraphQL API`。
- 测试覆盖：
  - 面板 API 调用 mock `/graphql`。
  - 请求体包含 `zoneTag` 和 `httpRequests1dGroups` 查询。
  - 后端能聚合请求数、缓存命中率、HTTPS 占比、国家/地区和状态码排行。

验证：

```bash
find public/js src test -name '*.js' -print -exec node --check {} \;
node --test test/**/*.test.js
```

验证结果：

- JS 语法检查通过。
- Node smoke 测试 7 项全部通过。

真实账号只读验证：

- 服务运行在：`http://localhost:3001`
- 真实接口：
  - `GET /api/zones/d5e960edf95175e6f3a03f51495ff495/analytics?days=7`
- 返回示例摘要：
  - Zone: `100222.xyz`
  - 时间范围：`2026-05-28` 至 `2026-06-03`
  - 请求数：`20,787`
  - 缓存命中率：`0.16%`
  - Top 国家/地区包含 `FR`、`US`、`BR`
- 浏览器验证页面：
  - `http://localhost:3001/#/zones/d5e960edf95175e6f3a03f51495ff495/analytics`
  - 点击“快速进入”后显示真实统计页。
  - 页面包含 `请求趋势`、`访问国家/地区`、`响应状态码`、`内容类型`。
  - 页面不再出现 `待接入` 占位。
  - 浏览器控制台无错误。

注意事项：

- 统计模块是只读功能，不会修改 Cloudflare 配置。
- Cloudflare GraphQL 的可用字段和账号套餐有关，当前服务层对空数组和缺失字段做了兜底。
- 当前趋势固定最近 7 天，服务层最多允许 30 天；后续如果做日期筛选，前端只需要把 `days` 参数暴露出来。
- 当前独立访客按日 `uniques` 累计展示，不等同于跨 7 天去重后的唯一访客。

## 2026-06-04 防火墙页面仿站返工检查点

用户反馈防火墙页没有按 cococ.co 原版风格实现，之前版本过于“工程表单化”。本次按原站 bundle 中可见的防火墙页面结构返工，视觉方向从厚重卡片改为轻量控制台。

参考到的原站结构特征：

- 页面主体使用 `max-w-4xl mx-auto` 类似窄容器。
- 顶部有 `← 返回域名列表` ghost 按钮。
- 主体是单个卡片，标题为 `防火墙规则管理`，副标题显示 `当前域名`。
- 创建区域使用浅灰背景和轻边框块：类似 `p-4 border border-border/50 rounded-lg bg-muted/30`。
- 表单为竖向紧凑控件，而不是横向大表单。
- 规则列表倾向于表格/列表管理风格，而不是大块规则卡片。

新增/调整：

- 重写 `public/js/views/zone/firewall-view.js`：
  - 去掉域名摘要大卡片，改为原站更接近的返回按钮 + 单卡片布局。
  - 创建区改成浅灰轻边框块。
  - 表单字段改为竖向排列。
  - 规则列表改成表格结构：`规则 / 动作 / 状态 / 操作`。
  - 新增 `规则描述` 字段，后端已有 `description` 支持。
  - 自定义表达式类型使用 `textarea`。
- 重写 `public/css/zone/firewall.css`：
  - 新增 `firewall-page` 896px 居中宽度。
  - 新增轻量 `firewall-panel`、`firewall-create-box`、`firewall-table` 样式。
  - 删除旧的横向表单、大规则卡片样式。
- 调整 `public/js/actions/zone-settings-actions.js`：
  - `readFirewallForm()` 读取 `description`。
  - 切换规则类型时清空 `target`，避免 IP/国家/表达式输入串值。
  - 新增 `resetFirewallRuleForm()`。
- 调整 `public/js/events.js`：
  - 绑定 `#reset-firewall-form` 到 `resetFirewallRuleForm()`。
- 调整 `public/js/constants.js`：
  - `defaultFirewallForm` 增加 `description`。

验证：

```bash
find public/js src test -name '*.js' -print -exec node --check {} \;
node --test test/**/*.test.js
```

验证结果：

- JS 语法检查通过。
- Node smoke 测试 7 项全部通过。

浏览器验证：

- 页面：
  - `http://localhost:3001/#/zones/d5e960edf95175e6f3a03f51495ff495/firewall`
- 点击“快速进入”后进入真实页面。
- 验证结果：
  - 显示 `← 返回域名列表`。
  - 显示 `防火墙规则管理`。
  - 主体卡片宽度约 `896px`。
  - 创建区域背景为浅灰 `rgb(246, 247, 249)`。
  - 显示 `规则描述` 字段。
  - 已移除旧 `.firewall-create-card`。
  - 不再显示旧域名摘要里的 `区域ID:`。
  - 控制台无错误。

注意事项：

- 本次仅改变防火墙页视觉结构和前端字段读取，没有新增真实 Cloudflare 写入语义。
- 浏览器验证未提交创建/删除规则，未修改真实 Cloudflare 配置。

## 2026-06-04 防火墙页面按原版重写检查点

用户继续反馈“防火墙也按原版重写”，本次在前一次轻量布局基础上进一步对齐 cococ.co 原版防火墙页面，并补齐真实编辑/启停能力。

核心变化：

- 后端新增防火墙规则更新接口：
  - `PATCH /api/zones/:zoneId/firewall-rules/:ruleId`
  - 对应 Cloudflare：`PATCH /zones/{zone_id}/firewall/rules/{rule_id}`
  - 支持更新 `action`、`description`、`filter.expression`、`filter.id`、`paused`。
- `src/services/cloudflare/firewall-rules-service.js`：
  - `custom` 和旧 `expression` 类型均兼容。
  - 非自定义规则仍强制校验 IP、国家代码、ASN，避免用 `expression` 绕过输入边界。
  - 标准化返回新增 `filterDescription`、`createdOn`、`modifiedOn`。
- 前端新增/调整：
  - `public/js/firewall-examples.js` 独立维护表达式示例数据，避免视图文件过大。
  - `public/js/views/zone/firewall-view.js` 按原版结构重写：
    - `max-width: 896px` 的单卡片页面。
    - 顶部 `← 返回域名列表`。
    - 灰底轻边框创建区。
    - 默认 IP/国家/ASN 模式只展示目标值输入。
    - 自定义表达式模式展示 `查看示例/隐藏示例`、描述字段和原版风格示例抽屉。
    - 现有规则改为原版风格规则卡片，包含动作 badge、启用/暂停 badge、表达式、ID、Filter ID、创建/修改时间。
  - `public/css/zone/firewall.css` 重写为原版轻控制台风格，去掉前一次的表格样式。
  - `public/js/actions/zone-settings-actions.js`：
    - 支持编辑规则。
    - 支持启用/暂停规则。
    - 支持套用表达式示例。
  - `public/js/events.js`：
    - 绑定示例展开、示例套用、编辑、启停按钮。
  - `public/js/api.js`：
    - 新增 `updateFirewallRule()`。
  - `public/js/state.js`：
    - 新增 `editingFirewallRuleId`、`showFirewallExamples`、`updatingFirewallRuleId`。

新增/调整测试：

- `test/smoke.test.js` 的防火墙测试新增 PATCH 覆盖。
- 测试断言：
  - 面板 PATCH 路由能调用 Cloudflare legacy firewall rule PATCH。
  - `filter.id`、表达式、描述和 `paused` 状态会被正确传递。
  - 返回值会标准化为前端可用字段。

验证：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/**/*.test.js
```

验证结果：

- JS 语法检查通过。
- Node smoke 测试 7 项全部通过。

浏览器验证：

- 验证服务：`http://localhost:3003`
- 使用真实用户路径验证：
  - 快速进入。
  - 点击 `100222.xyz`。
  - 点击单域名管理里的 `防火墙`。
- 验证页面：
  - `http://localhost:3003/#/zones/d5e960edf95175e6f3a03f51495ff495/firewall`
- 验证结果：
  - 默认 IP 模式显示 `IP 地址` 输入框，不显示 `规则描述（可选）`。
  - 自定义表达式模式显示 `规则描述（可选）`。
  - `查看示例` 能展开，包含 `表达式示例`、`阻止恶意扫描器`、`关于 CC 攻击防护`。
  - 当前真实 Zone 无规则时显示 `暂无防火墙规则` 和 `创建规则后将在此处显示`。
  - 浏览器控制台错误数为 0。

注意事项：

- 浏览器验证未提交创建、更新、启停或删除操作，未修改真实 Cloudflare 配置。
- 当前新版服务进程监听在 `3003`，PID 为 `33723`；`3000` 和 `3001` 仍是之前已经存在的旧进程，未在本次清理。
- 当前实现仍是 legacy firewall rules 管理；原版后续还包含 Rate Limiting Rules/自定义 WAF 规则方向，可以作为下一功能继续接。
- 当前应用的连接状态是内存态，整页刷新后会回到连接页；验证时应走“快速进入 -> 域名 -> 防火墙”的页面内路径。

## 2026-06-04 字体与统计页按原版优化检查点

用户要求“把字体按原版优化一下，然后统计按原版设计”。本次对照 `https://cococ.co` 当前线上打包资源，重点还原原站 shadcn/Tailwind 管理台的紧凑字体比例和统计分析页面结构。

参考到的原站特征：

- 基础字体使用 Tailwind 默认 `ui-sans-serif, system-ui` 栈，不是偏厚重的大字号字体。
- 侧栏宽度约 `16rem`，菜单按钮为 `h-8 text-sm`，图标约 `1rem`。
- 品牌区域是紧凑 32px 图标、14px 品牌名、12px 账号邮箱。
- 顶栏是轻量 `border-b border-border/40 bg-card/50 backdrop-blur` 风格。
- 统计页主体为 `max-w-6xl mx-auto`。
- 统计页卡片为 `shadow-card`、8px 圆角、浅边框、`p-4`/`gap-4` 密度。
- 分析统计页面结构包含：
  - 顶部 `← 返回域名列表` 和 `刷新数据`。
  - 标题 `分析统计`，副标题 `当前域名: ... - 最近 ...`。
  - 范围按钮 `24小时`、`7天`、`30天`。
  - 4 个主指标：`总请求数`、`带宽使用`、`独立访客`、`威胁拦截`。
  - 3 个缓存指标：`缓存命中率`、`缓存字节数`、`带宽节省`。
  - `每日流量统计`、两列统计卡、三列排行卡。

新增/调整：

- `public/css/base.css`
  - 基础字体栈调回原站同类的 `ui-sans-serif/system-ui`。
  - 全局字重回到 400，标题回到 18px/16px + 700。
  - 全局阴影改为原站轻量 `shadow-card` 方向。
- `public/css/layout.css`
  - 侧栏从上一轮放大的 280px/大字版收回到 256px 紧凑管理台比例。
  - 品牌区、账号邮箱、菜单项、图标、顶栏高度和内容间距按原站比例重调。
- `public/css/zone/navigation.css`
  - 单域名二级菜单改为紧凑 `text-sm / h-8 / 1rem icon` 风格。
- `public/js/views/shell-view.js`
  - 品牌区域继续显示当前账号邮箱和下拉箭头，贴近原站账号切换入口。
- `public/js/state.js`
  - 新增并保留 `analyticsRange`，默认 `7d`。
- `public/js/actions/analytics-actions.js`
  - 支持 `24h`、`7d`、`30d` 范围切换。
  - 前端 `24h` 当前映射到后端 `days=1`，因为现有 GraphQL 服务是日级聚合。
- `public/js/events.js`
  - 新增 `[data-analytics-range]` 事件绑定。
- `public/js/views/zone/analytics-view.js`
  - 按原站结构重写统计页，不再使用旧的趋势条/旧指标类名。
- `public/css/zone/analytics.css`
  - 按原站卡片密度、字重、边框、浅渐变指标卡重写。
- `public/css/responsive.css`
  - 清理旧统计类名响应式规则。
  - 新增新统计页类名在移动端的一列布局和按钮宽度约束。

验证：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/**/*.test.js
```

验证结果：

- JS 语法检查通过。
- Node smoke 测试 7 项全部通过。

浏览器验证：

- 验证服务：`http://localhost:3003`
- 使用真实用户路径：
  - 打开 `http://localhost:3003/`。
  - 点击 `快速进入`。
  - 点击域名 `100222.xyz`。
  - 点击单域名管理中的 `统计分析`。
- 验证页面：
  - `http://localhost:3003/#/zones/d5e960edf95175e6f3a03f51495ff495/analytics`
- 验证结果：
  - 侧栏恢复原站紧凑字体比例：品牌 14px、账号 12px、菜单 14px。
  - 页面显示 `分析统计` 标题和 `当前域名: 100222.xyz - 最近 7 天`。
  - 页面包含 `24小时`、`7天`、`30天` 范围按钮。
  - 页面包含 4 个主指标、3 个缓存指标、每日流量统计、两列统计卡和三列排行卡。
  - 点击 `24小时`、`30天`、`7天` 均能刷新并更新副标题。
  - 浏览器控制台错误数为 0。
  - 未触发任何 Cloudflare 写操作。
- 验证截图：
  - `cloudflare-analytics-original-style.png`

注意事项：

- 当前统计数据仍来自 Cloudflare GraphQL `httpRequests1dGroups`，是只读能力。
- 原站后续还包含“安全采样日志”等统计扩展，本项目后端暂未实现对应查询，建议作为后续独立功能接入。
- 当前 `3003` 监听进程仍为本项目服务，可继续用于下一轮本地验证。

## 2026-06-04 页面规则与证书管理按原版仿制检查点

用户要求“https://cococ.co，抄一下页面规则和证书管理”。本次基于已下载的 cococ.co 当前线上打包资源片段 `/tmp/page-rules.snippet.js`、`/tmp/certificates.snippet.js`，按原站结构补齐单域名管理里的页面规则和证书管理。

新增/调整：

- `src/services/cloudflare/page-rules-service.js`
  - 接入 Cloudflare Page Rules API：`GET/POST/PATCH/DELETE zones/:zoneId/pagerules`。
  - 统一标准化页面规则为表单字段：URL 模式、状态、缓存级别、浏览器缓存、安全级别、SSL、始终 HTTPS、URL 转发。
  - 后端校验 URL 转发和始终 HTTPS 的互斥规则，避免提交 Cloudflare 不接受的组合。
- `src/services/cloudflare/certificates-service.js`
  - 接入 Universal SSL 状态：`GET zones/:zoneId/ssl/universal/settings`。
  - 接入自定义证书列表/删除：`GET/DELETE zones/:zoneId/custom_certificates`。
  - 自定义证书列表在 Free/Pro 套餐无权限时降级为空列表并返回 warning，页面仍能展示 Universal SSL 状态。
  - 证书 ID 校验改用安全资源段校验，避免误把所有 Cloudflare 资源 ID 限死为 32 位十六进制。
- `src/controllers/page-rules-controller.js`
- `src/controllers/certificates-controller.js`
- `src/routes/api-routes.js`
- `src/bootstrap.js`
- `src/app.js`
  - 完成新服务的控制器、路由、容器装配。
- `public/js/views/zone/page-rules-view.js`
  - 按原站 `max-w-4xl mx-auto`、返回按钮、卡片标题、创建/编辑框、现有规则列表结构重写。
  - 字段顺序、选项文案和提示文案对齐原站。
  - 页面规则列表支持启停、编辑、删除按钮；浏览器验收未触发这些写操作。
- `public/js/views/zone/certificates-view.js`
  - 按原站自定义证书上传框、企业版提示、证书状态监控、Universal SSL 说明、自定义证书空态、到期提醒结构重写。
  - 自定义证书上传按钮保持禁用，符合原站和当前套餐边界。
- `public/css/zone/page-rules.css`
- `public/css/zone/certificates.css`
  - 对齐原站紧凑卡片、8px 圆角、轻边框、小字号表单、浅色 warning/status 区块。
- `public/js/state.js`
- `public/js/constants.js`
- `public/js/api.js`
- `public/js/actions/zone-settings-actions.js`
- `public/js/actions.js`
- `public/js/events.js`
- `public/js/views/zone-settings-view.js`
- `public/css/zone.css`
  - 接入状态、API、事件、路由视图和样式导入。
- `test/smoke.test.js`
  - 新增页面规则 CRUD API 映射测试。
  - 新增证书状态读取、证书删除、证书列表无权限降级测试。

验证：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/**/*.test.js
```

验证结果：

- JS 语法检查通过。
- Node smoke 测试 10 项全部通过。

本地服务：

- 已重启 `http://localhost:3003`，当前 PID 为 `59314`。
- 新版 GET 探针：
  - `GET /api/session/status` 返回已配置服务端凭据，未泄露 Global API Key。
  - `GET /api/zones/d5e960edf95175e6f3a03f51495ff495/page-rules` 返回 `{"rules":[]}`。
  - `GET /api/zones/d5e960edf95175e6f3a03f51495ff495/certificates` 返回 Universal SSL 已激活，自定义证书列表因套餐限制转为 warning。

浏览器验证：

- 验证服务：`http://localhost:3003`
- 使用真实用户路径：
  - 打开 `http://localhost:3003/`。
  - 点击 `快速进入`。
  - 点击域名 `100222.xyz`。
  - 点击单域名管理中的 `页面规则`。
  - 点击单域名管理中的 `证书管理`。
- 页面规则验证结果：
  - 页面显示 `页面规则管理`、`当前域名: 100222.xyz`。
  - 创建规则表单包含原站字段和选项：URL 模式、规则状态、缓存级别、浏览器缓存、安全级别、SSL 模式、始终 HTTPS、转发类型。
  - 当前真实 Zone 无页面规则时显示 `暂无页面规则`。
  - 选择 `始终 HTTPS = 开启` 后，缓存、浏览器缓存、安全级别、SSL、转发类型均禁用，并显示 `注意：URL转发 和 始终HTTPS 不能与其他设置同时使用`。
  - 浏览器控制台错误数为 0。
- 证书管理验证结果：
  - 页面显示 `自定义证书管理`、`当前域名: 100222.xyz`。
  - 上传自定义 SSL 证书、证书、私钥、证书链、上传证书禁用按钮和企业版提示按原站展示。
  - `证书状态监控` 显示套餐限制 warning、`Cloudflare Universal SSL ● 已激活`、Universal SSL 说明、无自定义证书空态、到期提醒。
  - 浏览器控制台错误数为 0。
- 验证截图：
  - `cloudflare-page-rules-original-style.png`
  - `cloudflare-certificates-original-style.png`

注意事项：

- 浏览器验证未点击创建、更新、启停、删除等会修改真实 Cloudflare 配置的按钮。
- 页面规则写接口已经接好且有 mock 测试覆盖，真实写操作建议后续在专门测试 Zone 上验收。
- 自定义证书上传仍按原站保持禁用；如果后续要真正支持 Enterprise 上传，需要新增 POST `zones/:zoneId/custom_certificates`、PEM 校验和敏感输入保护。

## 2026-06-04 防火墙打不开修复与单域名侧栏/证书页精修检查点

用户反馈“防火墙点击打不开，然后按照版再精修一下图二页面的样式”，并提供了单域名侧栏局部截图，截图重点是 DNS/SSL/缓存/防火墙菜单项的 16px 左右字号、18px 左右线性图标、40px 左右行高和浅灰选中背景。

根因：

- `public/js/views/zone/firewall-view.js` 中 `renderActionOptions()` 使用了 `firewallActions`，但文件只从 `constants.js` 导入了 `firewallRuleTypes`。
- 点击单域名侧栏 `防火墙` 后会进入防火墙视图渲染，前端抛出未定义变量错误，表现为页面点击打不开。

修复/调整：

- `public/js/views/zone/firewall-view.js`
  - 补齐 `firewallActions` 导入，防火墙页面可正常渲染。
- `test/smoke.test.js`
  - 新增 `renders firewall settings view without frontend reference errors`，直接渲染防火墙视图，防止此类漏导入再次回归。
- `public/css/zone/navigation.css`
  - 单域名侧栏导航按截图继续精修：
    - 行高从 32px 调到 40px。
    - 文本从 14px 调到 16px。
    - 图标从 16px 调到 18px，线条略加重。
    - 菜单间距和选中态改为更接近原版的浅灰圆角块。
- `public/css/zone/certificates.css`
  - 证书管理页继续按原站精修：
    - 返回按钮、标题、副标题、灰底上传卡片、textarea、warning、Universal SSL 状态和提醒行密度微调。
    - 保持原站 8px 卡片圆角和轻边框，不改变功能结构。

验证：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/**/*.test.js
```

验证结果：

- JS 语法检查通过。
- Node smoke 测试 11 项全部通过。

浏览器验证：

- 验证服务：`http://localhost:3003`
- 使用真实用户路径：
  - 刷新页面后点击 `快速进入`。
  - 进入域名 `100222.xyz`。
  - 点击单域名侧栏 `防火墙`。
  - 点击单域名侧栏 `证书管理` 检查精修样式。
- 防火墙验证结果：
  - URL 正常切换为 `http://localhost:3003/#/zones/d5e960edf95175e6f3a03f51495ff495/firewall`。
  - 页面显示 `防火墙规则管理`、规则类型、动作、IP 地址输入、现有规则、暂无防火墙规则空态。
  - 浏览器控制台错误数为 0。
- 证书页/侧栏验证结果：
  - 单域名侧栏菜单选中态更接近用户截图：浅灰背景、较大菜单字、线性图标更清晰。
  - 证书管理页面仍显示原站结构：上传自定义 SSL 证书、企业版提示、证书状态监控、Universal SSL、到期提醒。
  - 浏览器控制台错误数为 0。
- 验证截图：
  - `cloudflare-firewall-open-fixed.png`
  - `cloudflare-certificates-refined.png`

注意事项：

- 未点击防火墙创建、编辑、启停、删除按钮，未修改真实 Cloudflare 配置。
- 本轮仅修复防火墙打开错误和样式精修；防火墙规则功能仍使用现有 legacy firewall rules API。

## 2026-06-04 DNS/SSL/缓存字体过大修复检查点

用户指出截图中圈出的单域名侧栏、DNS 记录页内容区字体过大，并明确要求 `DNS 记录`、`SSL/TLS`、`缓存管理` 三个页面按原版修复字体大小。

问题确认：

- 浏览器 computed style 显示旧版大字号仍在生效：
  - 单域名侧栏菜单：`16px / 40px`。
  - DNS 摘要域名标题：`30px`。
  - DNS 操作按钮：`16px / 54px`。
  - DNS 列表标题：`26px`。
  - DNS 行：`15px / 68px`。
- 原因是上一轮按截图误把侧栏放大，并且 DNS/通用设置页仍沿用了早期“大屏卡片”字号。

修复/调整：

- `public/css/zone/navigation.css`
  - 单域名侧栏恢复原版紧凑比例：`14px` 字号、`32px` 行高、`16px` 图标、浅灰选中态。
- `public/css/dns/summary.css`
  - DNS/SSL/缓存共享的域名摘要卡缩小：
    - 域名标题 `30px -> 24px`。
    - 区域 ID `15px -> 13px`。
    - 描述文字 `16px -> 14px`。
    - 卡片 padding 从 `34px 42px` 收到 `24px 28px`。
- `public/css/dns/toolbar.css`
  - DNS 操作按钮 `54px/16px` 调整为 `40px/14px`。
- `public/css/dns/records.css`
  - DNS 记录列表标题 `26px -> 20px`。
  - DNS 行 `68px/15px` 调整为 `58px/14px`。
  - 类型标签、代理圆点、行操作按钮同步缩小。
- `public/css/dns/form.css`
  - DNS 表单标题、网格间距、代理开关、表单按钮同步回到紧凑尺寸。
- `public/css/zone/settings.css`
  - `SSL/TLS` 和静态设置页标题层级回到原版比例：
    - 页面标题 `30px -> 18px`。
    - 卡片标题 `18px -> 16px`。
    - 选项标题 `16px -> 14px`。
    - 说明文字 `14px/15px -> 13px/14px`。
    - 开关 `54x30 -> 42x24`。
- `public/css/zone/cache.css`
  - 缓存页 select、输入框、清除缓存按钮调整到 `36px/14px`。
- `public/css/components/buttons.css`
  - 全局普通按钮恢复原版管理台常见的 `36px/14px/600`。

验证：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/**/*.test.js
```

验证结果：

- JS 语法检查通过。
- Node smoke 测试 11 项全部通过。

浏览器验证：

- 验证服务：`http://localhost:3003`
- 真实路径：`快速进入 -> 100222.xyz -> DNS 记录 / SSL/TLS / 缓存管理`。
- DNS computed style 验证：
  - 单域名侧栏：`14px / 32px`。
  - DNS 摘要域名标题：`24px`。
  - 区域 ID：`13px`。
  - DNS 操作按钮：`14px / 40px`。
  - DNS 列表标题：`20px`。
  - DNS 行：`14px / 58px`。
- SSL/TLS computed style 验证：
  - 页面标题：`18px`。
  - 卡标题：`16px`。
  - 选项标题：`14px`。
  - 选项说明：`13px`。
  - 刷新按钮：`14px / 36px`。
- 缓存管理 computed style 验证：
  - 页面标题：`18px`。
  - 卡标题：`16px`。
  - 选项标题：`14px`。
  - select/input/button：`14px / 36px`。
- 验证截图：
  - `cloudflare-dns-font-refined.png`
  - `cloudflare-ssl-font-refined.png`
  - `cloudflare-cache-font-refined.png`

注意事项：

- 本轮只做字号/密度修复，没有修改 DNS、SSL/TLS、缓存相关写操作逻辑。
- 完整 reload 后会回到连接页是当前项目既有内存态行为；验证时走 `快速进入` 重新进入单域名页面。

## 2026-06-04 一键加速蜘蛛网络 UI 前端实现检查点

用户要求“直接抄原版蜘蛛网络的 UI”，并且上一轮明确要求注意字体大小。本轮只实现前端 UI 和本地状态流程，不接入真实 Cloudflare 写操作，也不触发外部部署/验证接口。

原版参考：

- `https://cococ.co`
- 本地提取 bundle：
  - `/tmp/cococ-current.js`
  - `/tmp/cococ-current.css`
- 关键原版结构：
  - 容器：`w-full max-w-2xl mx-auto space-y-3`
  - 主卡：`p-4 shadow-card`
  - 标题：`text-xl font-bold mb-4 bg-gradient-to-r from-primary to-accent`
  - 输入/按钮：`h-9 text-sm`
  - 辅助说明：`text-[11px] text-muted-foreground`

实现/调整：

- `public/js/constants.js`
  - 新增 `speedOptimizedDomains`：`cdn.cnno.de`、`cdn.ddeed.de`。
  - 新增 `defaultSpeedForm`，默认缓存时间 `0`，默认优选域名 `cdn.cnno.de`。
- `public/js/state.js`
  - 新增一键加速专属前端状态：
    - `speedStep`
    - `speedProgress`
    - `speedDeploying`
    - `speedVerificationOpen`
    - `speedDomainsOpen`
    - `speedNotice`
    - `speedForm`
    - `speedAcceleratedDomains`
  - 新增 `resetSpeedForm()`、`resetSpeedState()`，登出/重置会清空一键加速前端状态。
- `public/js/actions/speed-actions.js`
  - 新增一键加速前端动作。
  - 表单校验：
    - 源站域名不能为空。
    - 访问域名不能为空。
    - 缓存时间必须是非负整数。
  - `配置完成` 打开本地安全验证弹窗。
  - `验证` 只检查授权码是否填写，然后进入准备部署页。
  - `开始加速` 只用本地计时器模拟 `25 -> 75 -> 100` 进度，完成后写入 `speedAcceleratedDomains` 并进入成功页。
  - `查看已加速的域名` 展示本地前端列表。
- `public/js/views/speed-view.js`
  - 新增专用一键加速视图，复刻原版字段、文案、状态页和弹窗：
    - `一键加速域名配置`
    - `访问域名`
    - `源站域名`
    - `缓存时间（秒）`
    - `优选域名`
    - `配置完成`
    - `安全验证`
    - `准备部署`
    - `部署成功！`
    - `已加速的域名管理`
  - 成功页保留原版文案：`您的网站加速已成功部署，约10-30秒生效`。
- `public/js/views/feature-view.js`
  - 当 `state.mainSection === "speed"` 时分流到 `renderSpeedView()`。
  - 其它全局占位功能仍走原通用 feature 壳子。
- `public/js/events.js`
  - 新增一键加速表单、弹窗、部署和管理弹窗事件绑定。
- `public/js/actions.js`
  - 合并 `createSpeedActions()` 到全局 actions。
- `public/js/icons.js`
  - 新增 `x` 图标，用于管理弹窗关闭按钮。
- `public/styles.css`
  - 新增导入 `/css/features/speed.css`。
- `public/css/features/speed.css`
  - 新增一键加速专用 CSS，避免影响 DNS/SSL/缓存等已修复字号页面。
  - 核心尺寸按原版映射：
    - 页面内容宽度：`max-width: 672px`。
    - 主卡 padding：`16px`。
    - 主标题：`20px / 28px`。
    - 标签：`14px`。
    - 输入、select、按钮：`36px` 高，`14px` 字号。
    - 辅助说明：`11px / 16px`。
    - 安全/管理弹窗标题：`18px`。
    - 管理弹窗行标题：`14px`，元信息：`12px`。

验证：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/**/*.test.js
```

验证结果：

- 全量 JS 语法检查通过。
- Node smoke 测试 11 项全部通过。
- 变更后复跑关键文件语法检查通过：
  - `public/js/events.js`
  - `public/js/views/speed-view.js`
  - `public/js/actions/speed-actions.js`
  - `public/js/state.js`
  - `public/js/constants.js`
  - `public/js/icons.js`
- 变更后复跑 Node smoke 测试 11 项全部通过。

浏览器验证：

- 验证服务：`http://localhost:3003`
- 路径：刷新页面后点击 `快速进入`，进入侧栏 `一键加速`。
- 首屏 computed style：
  - 标题 `一键加速域名配置`：`20px / 28px`。
  - 字段 label：`14px / 14px`。
  - input/select：`14px / 36px`。
  - helper：`11px / 16px`。
  - 顶部 `查看已加速的域名` 按钮：`14px / 36px`。
  - 主卡宽度：`672px`，padding `16px`。
- 安全验证弹窗 computed style：
  - 标题：`18px / 20px`。
  - 输入：`14px / 36px`。
  - footer 文案：`12px / 16px`。
  - 按钮：`14px / 36px`。
- 准备部署/成功态验证：
  - `配置完成 -> 安全验证 -> 验证 -> 准备部署 -> 开始加速 -> 部署成功！` 全流程可点通。
  - 成功页显示 `访问域名：www.demo.com`、`Worker 状态：运行中`。
  - 该流程仅本地模拟，无真实 Cloudflare 写请求。
- 已加速域名管理弹窗验证：
  - 可通过顶部按钮打开。
  - 能显示本地模拟记录 `www.demo.com / origin.demo.com / cdn.cnno.de / 运行中`。
  - 弹窗标题 `18px`，行标题 `14px`，元信息 `12px`。
- 浏览器控制台错误数：`0`。

## 2026-06-04 一键加速真实 Cloudflare 编排检查点

用户补充了一键加速的真实实现步骤：

1. 对一级域名 `xx.com` 添加 `saas.xx.com`，A 记录指向 `6.6.6.6`，备注 `一键加速回退源`。
2. 将 SSL/TLS 加密模式改成 `Flexible`。
3. 在 Cloudflare for SaaS 的 SSL 回退源中添加 `saas.xx.com`。
4. 按截图中的自定义主机名流程添加访问域名，TLS 1.2、Cloudflare 提供证书、HTTP 验证，源站域名作为 custom origin server。

实现/调整：

- `src/services/cloudflare/cloudflare-client.js`
  - 新增 `put()`，用于 fallback origin 接口。
- `src/services/cloudflare/speed-deploy-service.js`
  - 新增 `SpeedDeployService`，集中处理一键加速编排。
  - 后端接口会校验：
    - `zoneId` 必须是 Cloudflare 32 位 ID。
    - `zoneName`、`accessDomain`、`targetDomain`、`optimizedDomain` 必须是域名格式。
    - `accessDomain` 必须属于当前 `zoneName`。
    - `cacheTtl` 必须是非负整数。
  - 回退源 DNS 记录采用谨慎幂等策略：
    - 不存在 `saas.xx.com` 时创建 A 记录。
    - 已存在单条 `saas.xx.com A 6.6.6.6` 时补齐/更新 `proxied: true` 和备注。
    - 若同名存在其它类型或其它内容，返回 `409`，避免覆盖用户原有解析。
    - 若同名存在多条 A 记录，返回 `409`。
  - SSL 模式：
    - `PATCH /zones/{zoneId}/settings/ssl`
    - body `{ "value": "flexible" }`
  - SaaS fallback origin：
    - `PUT /zones/{zoneId}/custom_hostnames/fallback_origin`
    - body `{ "origin": "saas.xx.com" }`
  - 自定义 hostname：
    - 先 `GET /zones/{zoneId}/custom_hostnames?hostname=...` 查询是否存在。
    - 不存在时 `POST /zones/{zoneId}/custom_hostnames`。
    - 已存在时 `PATCH /zones/{zoneId}/custom_hostnames/{id}` 更新 `custom_origin_server` 和 SSL 设置。
    - SSL 配置为 `method: "http"`、`type: "dv"`、`settings.min_tls_version: "1.2"`。
- `src/controllers/speed-deploy-controller.js`
  - 新增 `deploy()` controller。
- `src/routes/api-routes.js`
  - 新增后端路由：
    - `POST /api/zones/:zoneId/speed-deploy`
- `src/bootstrap.js` / `src/app.js`
  - 接入 `SpeedDeployService` 和 `SpeedDeployController`。
- `public/js/api.js`
  - 新增 `deploySpeedAcceleration(zoneId, request)`。
- `public/js/actions/speed-actions.js`
  - “开始加速”从本地模拟改成调用后端真实部署接口。
  - 前端根据 `访问域名` 从 `state.zones` 里选择最长后缀匹配的 zone。
  - 成功后写入 `speedAcceleratedDomains`，失败显示后端错误。
  - 浏览器验证时未点击“开始加速”，避免对真实 Cloudflare 做写操作。
- `test/speed-deploy.test.js`
  - 新增一键加速专用测试文件，避免继续扩大 `smoke.test.js`。
  - 覆盖：
    - 首次部署：创建 DNS、改 SSL、设置 fallback origin、创建 custom hostname。
    - 幂等更新：更新已存在的回退源 A 记录、更新已存在 custom hostname。
    - 边界阻断：访问域名不属于 zone 时返回 400，且不请求 Cloudflare mock API。

验证：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/**/*.test.js
```

验证结果：

- 全部 JS 语法检查通过。
- Node 测试 14 项全部通过。
- 测试只使用本地 mock Cloudflare API，没有触发真实 Cloudflare 写操作。

浏览器验证：

- 验证服务：`http://localhost:3003`
- 连接页识别到服务端凭据，点击 `快速进入` 后进入后台。
- 点击侧栏 `一键加速`：
  - `#speed-form` 正常渲染。
  - 标题：`一键加速域名配置`。
  - 访问域名 placeholder：`www.xx.com`。
  - 源站域名 placeholder：`jiasu.xx.com`。
  - 优选域名选项：
    - `cdn.cnno.de` -> `cdn.cnno.de`
    - `cdn.ddeed.de` -> `cdn.ddeed.de`
    - `saas.sin.fan 推荐` -> `saas.sin.fan`
  - 浏览器控制台错误数：`0`。

重要注意：

- 这次没有执行真实“一键加速”部署按钮。
- 当前后端已经会真实调用 Cloudflare 写接口；后续测试真实账号时请确认访问域名、源站域名和 zone 选择无误。
- 验证截图：
  - `cloudflare-speed-config.png`
  - `cloudflare-speed-domains-modal.png`

后续接真实功能入口：

- 真实授权校验可替换 `public/js/actions/speed-actions.js` 中 `verifySpeedAuthorization()`。
- 真实部署 API 可替换 `startSpeedDeploy()` 中本地 `progressStages` 模拟逻辑。
- 真实已加速域名列表可替换 `openSpeedDomainsDialog()` 或新增 API loading 状态，当前 UI 已保留空态和列表结构。

## 2026-06-04 一键加速使用前必看说明区检查点

用户提供截图，要求“把下边这行字抄一下”。本轮在一键加速页表单下方追加原版 `使用前必看` 说明区。

实现/调整：

- `public/js/views/speed-view.js`
  - 新增 `renderSpeedUsageGuide()`。
  - 在一键加速表单/状态卡下方追加说明卡。
  - 文案按截图录入：
    - `使用前必看`
    - `加速自己的网站`
    - `加速别人的网站`
    - `缓存使用说明`
  - 三段说明文案照截图内容保留引号、域名示例和缓存默认值 `"0"`。
- `public/css/features/speed.css`
  - 新增 `speed-guide-card`、`speed-guide-grid`、`speed-guide-item` 样式。
  - 说明卡使用更宽内容区域，接近截图中表单下方横向大卡：
    - 卡片宽随 `speed-content`，当前桌面验证宽度 `1024px`。
    - padding `32px`。
    - 标题 `20px / 28px`。
    - 三列标题 `16px / 24px`。
    - 正文 `15px / 21.75px`。
    - 三列间距 `48px`。
  - 移动端保持单列排版，避免文字挤压。

验证：

```bash
node --check public/js/views/speed-view.js
node --test test/**/*.test.js
```

验证结果：

- `public/js/views/speed-view.js` 语法检查通过。
- Node smoke 测试 11 项全部通过。

浏览器验证：

- 验证服务：`http://localhost:3003`
- 路径：刷新页面后点击 `快速进入`，进入侧栏 `一键加速`。
- computed style：
  - 说明卡宽度：`1024px`。
  - 说明卡 padding：`32px`。
  - `使用前必看` 标题：`20px / 28px`。
  - 三列标题：`16px / 24px`。
  - 正文：`15px / 21.75px`。
- 页面显示三段原版说明文案。
- 浏览器控制台错误数：`0`。
- 验证截图：
  - `cloudflare-speed-guide.png`

## 2026-06-04 一键加速优选域名推荐项检查点

用户要求在一键加速 `优选域名` 中添加 `saas.sin.fan`，并在这个域名后加上 `推荐` 两个字。

实现/调整：

- `public/js/constants.js`
  - 将 `speedOptimizedDomains` 从字符串数组升级为 `{ value, label }` 结构。
  - 新增选项：
    - `value: "saas.sin.fan"`
    - `label: "saas.sin.fan 推荐"`
  - `defaultSpeedForm.optimizedDomain` 继续使用真实域名值 `speedOptimizedDomains[0].value`。
- `public/js/views/speed-view.js`
  - `renderOptimizedDomainOptions()` 改为使用 `domain.value` 作为 `<option value>`，使用 `domain.label` 作为展示文本。
  - 这样提交/后续接 API 时拿到的仍是 `saas.sin.fan`，不会携带 `推荐` 文案。

验证：

```bash
node --check public/js/constants.js
node --check public/js/views/speed-view.js
node --check public/js/actions/speed-actions.js
node --test test/**/*.test.js
```

验证结果：

- 相关 JS 语法检查通过。
- Node smoke 测试 11 项全部通过。

浏览器验证：

- 验证服务：`http://localhost:3003`
- 路径：刷新页面后点击 `快速进入`，进入侧栏 `一键加速`。
- `#optimizedDomain` 选项：
  - `cdn.cnno.de` -> value `cdn.cnno.de`
  - `cdn.ddeed.de` -> value `cdn.ddeed.de`
  - `saas.sin.fan 推荐` -> value `saas.sin.fan`
- 默认选中仍为 `cdn.cnno.de`。
- 浏览器控制台错误数：`0`。

## 2026-06-05 一键加速原版后续样式精修检查点

用户要求“用一下原版的一键加速，然后抄一下他的后续样式”。本轮继续对照 `https://cococ.co` 当前打包资源中一键加速组件，重点还原 `配置完成` 之后的状态页和弹窗样式。

对照来源：

- 原站资源：
  - `/assets/index-ktA5GlZY.js`
  - `/assets/index-CpSmGiz8.css`
- 本地缓存片段：
  - `/tmp/cococ-index.js`
  - `/tmp/cococ-current.js`
- 关键原版结构：
  - `准备部署`
  - `配置摘要`
  - `部署进度`
  - `安全验证`
  - `部署成功！`
  - `已加速的域名管理`
  - `已加速的域名`
  - `管理通过CDN加速的域名`
  - `使用前必看`

实现/调整：

- `public/js/views/speed-view.js`
  - `准备部署` 保持原版卡片层级：标题、摘要灰底块、进度蓝色浅底块、左右按钮。
  - `部署成功！` 保持原版成功圆形渐变图标、说明文案、灰底摘要和下一步按钮。
  - `安全验证` 改成原版对话框结构：图标标题、说明、`grid gap-4 py-4` 风格输入区、底部联系文案和动作按钮。
  - `已加速的域名管理` 弹窗改成原版外层管理标题 + 内层无边框卡片：
    - 标题 `已加速的域名`
    - 描述 `管理通过CDN加速的域名`
    - 右上 `刷新`
    - 空态 `暂无已加速的域名`
    - 列表项 `已加速` 绿色徽标
    - 删除图标按钮
  - 新增删除确认弹窗的前端结构，保持当前项目无真实删除后端时的安全边界。
- `public/css/features/speed.css`
  - 重写一键加速专用样式，统一到原版紧凑字号：
    - 主标题 `20px / 28px`
    - label/input/button `14px`
    - helper `11px`
    - 摘要/列表/说明正文 `12px`
    - 弹窗标题 `18px`
  - `使用前必看` 从旧的大卡片恢复为原版紧凑说明区：
    - 标题 `14px`
    - 三列标题 `12px`
    - 正文 `12px`
    - 间距 `16px`
  - 已加速域名弹窗按原版 `max-w-4xl` 对应宽度 `896px`、`max-height: 80vh`、`padding: 24px`。
- `public/js/actions/speed-actions.js`
  - 新增前端刷新动作 `refreshSpeedDomainsDialog()`，当前只重绘本地列表。
  - 新增本地删除确认流程：
    - `requestDeleteSpeedDomain()`
    - `cancelDeleteSpeedDomain()`
    - `confirmDeleteSpeedDomain()`
  - 删除只移除当前前端内存列表，不调用 Cloudflare 删除接口。
- `public/js/events.js`
  - 绑定 `刷新`、删除图标、删除确认和取消事件。
- `public/js/state.js`
  - 新增 `speedDomainDeleteId`，退出/重置时清空。
- `public/js/icons.js`
  - 新增 `refresh` 图标。

验证：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/**/*.test.js
node --check public/js/views/speed-view.js
node --check public/js/actions/speed-actions.js
node --check public/js/events.js
node --check public/js/state.js
node --check public/js/icons.js
```

补充渲染断言：

```bash
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { state } from './public/js/state.js';
import { renderSpeedView } from './public/js/views/speed-view.js';

const root = { className: '', innerHTML: '' };
globalThis.document = {
  querySelector(selector) {
    if (selector === '#app') return root;
    return null;
  },
};

Object.assign(state, {
  connected: true,
  sessionEmail: 'tester@example.com',
  mainSection: 'speed',
  view: 'domains',
  sessionHasServerCredentials: true,
  speedForm: {
    accessDomain: 'demo.100222.xyz',
    targetDomain: 'origin.example.com',
    cacheTtl: '0',
    optimizedDomain: 'saas.sin.fan',
  },
  speedProgress: 36,
  speedDeploying: false,
  speedVerificationOpen: false,
  speedDomainsOpen: false,
  speedDomainDeleteId: '',
  speedAcceleratedDomains: [
    {
      id: 'demo-1',
      accessDomain: 'demo.100222.xyz',
      targetDomain: 'origin.example.com',
      optimizedDomain: 'saas.sin.fan',
      status: '运行中',
    },
  ],
});

state.speedStep = 'deploy';
renderSpeedView();
assert.match(root.innerHTML, /准备部署/);
assert.match(root.innerHTML, /配置摘要/);
assert.match(root.innerHTML, /部署进度/);
assert.match(root.innerHTML, /36%/);
assert.match(root.innerHTML, /开始加速/);

state.speedStep = 'complete';
renderSpeedView();
assert.match(root.innerHTML, /部署成功！/);
assert.match(root.innerHTML, /Worker 状态/);
assert.match(root.innerHTML, /部署下一个加速/);

state.speedStep = 'domains';
state.speedDomainsOpen = true;
renderSpeedView();
assert.match(root.innerHTML, /已加速的域名管理/);
assert.match(root.innerHTML, /管理通过CDN加速的域名/);
assert.match(root.innerHTML, /刷新/);
assert.match(root.innerHTML, /已加速/);
assert.match(root.innerHTML, /data-speed-domain-id="demo-1"/);

state.speedDomainDeleteId = 'demo-1';
renderSpeedView();
assert.match(root.innerHTML, /确认删除/);

console.log('speed render assertions passed');
NODE
```

验证结果：

- 全部 JS 语法检查通过。
- Node 测试 14 项全部通过。
- 一键加速后续状态渲染断言通过。

浏览器验证：

- 验证服务：`http://localhost:3003`
- 当前服务已在 `3003` 监听。
- 刷新页面后点击 `快速进入`，进入侧栏 `一键加速`。
- `查看已加速的域名` 弹窗正常打开，结构包含：
  - `已加速的域名管理`
  - `已加速的域名`
  - `管理通过CDN加速的域名`
  - `刷新`
  - `暂无已加速的域名`
  - `关闭`
- computed style 抽样：
  - `.speed-gradient-title`: `20px / 28px`
  - `.speed-field span`: `14px`
  - `.speed-field input`: `14px`, height `36px`
  - `.speed-field small`: `11px / 16px`
  - `.speed-guide-card h2`: `14px / 20px`
  - `.speed-guide-item h3`: `12px / 16px`
  - `.speed-guide-item p`: `12px / 16.2px`
  - `.speed-domains-dialog`: width `896px`, padding `24px`
  - `.speed-domains-card-header h3`: `18px / 20px`
  - `.speed-refresh-button`: height `32px`

重要安全边界：

- 本轮没有点击 `开始加速`。
- 本轮没有触发任何真实 Cloudflare 写入或删除。
- 浏览器插件当前文本输入能力受虚拟剪贴板限制，无法用 in-app Browser 自动填表；后续状态用模块渲染断言覆盖。
- `已加速域名` 的刷新/删除当前仍是前端本地列表行为，后续如需真实同步 Cloudflare，需要单独设计查询和删除 API 的幂等/回滚边界。
- 验证截图：
  - `cloudflare-speed-postflow-refined.png`

## 2026-06-05 一键加速去授权码与接口 404 修复检查点

用户反馈：

- 点击一键加速后显示 `接口不存在`。
- 不再需要授权码弹窗。

问题定位：

- 源码中 `POST /api/zones/:zoneId/speed-deploy` 路由已经存在：
  - `src/routes/api-routes.js`
  - `src/controllers/speed-deploy-controller.js`
  - `src/services/cloudflare/speed-deploy-service.js`
- 当前 `http://localhost:3003` 运行进程 PID `59314` 是旧的 `node src/server.js`，未加载最新后端路由。
- 复现旧进程返回：

```bash
curl -s -i -X POST http://127.0.0.1:3003/api/zones/00000000000000000000000000000000/speed-deploy \
  -H 'Content-Type: application/json' \
  -d '{}'
```

旧进程结果：

```text
HTTP/1.1 404 Not Found
{"error":"接口不存在"}
```

实现/调整：

- `public/js/actions/speed-actions.js`
  - 删除 `readAuthorizationCode()`。
  - 删除 `closeSpeedVerification()`。
  - 删除 `verifySpeedAuthorization()`。
  - `submitSpeedConfig()` 表单校验成功后直接设置：
    - `state.speedForm = form`
    - `state.speedProgress = 0`
    - `state.speedNotice = ""`
    - `state.speedStep = "deploy"`
  - 因此 `配置完成` 现在直接进入 `准备部署`。
- `public/js/events.js`
  - 删除 `#speed-verification-form` submit 绑定。
  - 删除 `#speed-cancel-verification` click 绑定。
- `public/js/state.js`
  - 删除 `speedVerificationOpen` 状态。
  - `resetSpeedState()` 不再重置授权弹窗状态。
- `public/js/views/speed-view.js`
  - 删除 `renderSpeedVerificationDialog()`。
  - 一键加速页面不再渲染授权码/安全验证弹窗。
- `public/css/features/speed.css`
  - 删除授权弹窗输入区专用样式：
    - `.speed-dialog-grid`
    - `.speed-dialog-field`

服务重启：

```bash
kill 59314
PORT=3003 node src/server.js
```

新进程：

- PID `9028`
- 地址：`http://localhost:3003`

接口复测：

```bash
curl -s -i -X POST http://127.0.0.1:3003/api/zones/d5e960edf95175e6f3a03f51495ff495/speed-deploy \
  -H 'Content-Type: application/json' \
  -d '{}'
```

新进程结果：

```text
HTTP/1.1 400 Bad Request
{"error":"请输入一级域名"}
```

这说明接口已进入一键加速控制器，不再是路由不存在。

验证：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/**/*.test.js
rg -n "speedVerificationOpen|speed-verification|授权码|安全验证|verifySpeedAuthorization|closeSpeedVerification|readAuthorizationCode|speed-cancel-verification|authorizationCode" public/js public/css/features/speed.css src test || true
```

补充动作断言：

```bash
node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { createSpeedActions } from './public/js/actions/speed-actions.js';
import { defaultSpeedForm } from './public/js/constants.js';
import { state } from './public/js/state.js';

let renders = 0;
const fields = new Map([
  ['accessDomain', '222.baize.host'],
  ['targetDomain', '111.baize.host'],
  ['cacheTtl', '0'],
  ['optimizedDomain', 'saas.sin.fan'],
]);

globalThis.FormData = class FormDataStub {
  constructor() {}
  get(name) {
    return fields.get(name) || '';
  }
};

globalThis.document = {
  querySelector(selector) {
    if (selector === '#speed-form') return {};
    return null;
  },
};

globalThis.window = {
  setTimeout() {},
  clearTimeout() {},
};

Object.assign(state, {
  speedStep: 'domains',
  speedProgress: 99,
  speedNotice: 'old notice',
  speedForm: { ...defaultSpeedForm },
});

const actions = createSpeedActions({ renderApp: () => { renders += 1; } });
actions.submitSpeedConfig({ preventDefault() {} });

assert.equal(state.speedStep, 'deploy');
assert.equal(state.speedProgress, 0);
assert.equal(state.speedNotice, '');
assert.deepEqual(state.speedForm, {
  accessDomain: '222.baize.host',
  targetDomain: '111.baize.host',
  cacheTtl: '0',
  optimizedDomain: 'saas.sin.fan',
});
assert.equal('speedVerificationOpen' in state, false);
assert.equal(renders, 1);
console.log('speed submit skips authorization dialog');
NODE
```

验证结果：

- 授权码/安全验证相关前端关键字已清空。
- 全部 JS 语法检查通过。
- Node 测试 14 项全部通过。
- `submitSpeedConfig()` 动作断言通过：直接进入 `deploy`。
- `/api/zones/:zoneId/speed-deploy` 不再返回 `接口不存在`。

重要注意：

- 这轮只重启了 `3003` 上的本项目旧服务进程。
- 没有点击真实 `开始加速`。
- 没有触发真实 Cloudflare 写入。

## 2026-06-05 一键加速源站解析警告与访问域名 CNAME 修复检查点

用户反馈/需求：

1. 如果没有给源站域名添加 DNS 解析，需要警告“先添加解析才能加速”。
2. 一键加速时，访问/加速域名的 DNS 解析没有指向优选域名，例如 `cdn.cnno.de`。

实现/调整：

- `src/services/cloudflare/speed-deploy-service.js`
  - 新增 `sourceRecordTypes = new Set(["A", "AAAA", "CNAME"])`。
  - 新增 `assertSourceDnsRecord(config, records)`：
    - 仅当源站域名属于当前 zone 时检查。
    - 要求源站域名存在 `A`、`AAAA` 或 `CNAME` 解析。
    - 不存在时返回 `409`：
      - `源站域名 xxx 未添加 DNS 解析，请先添加 A、AAAA 或 CNAME 记录后再执行一键加速`
    - 此时只读取 DNS 列表，不继续创建/修改任何 DNS、SSL 或 SaaS 配置。
  - 新增 `ensureAccessDnsRecord(config, records)`：
    - 创建或更新访问域名的 `CNAME`。
    - `name = accessDomain`
    - `content = optimizedDomain`
    - `ttl = 1`
    - `proxied = false`
    - `comment = 一键加速优选域名`
    - 如果访问域名存在多条解析，返回 `409` 要求先清理。
  - 部署顺序调整为：
    1. 读取当前 zone DNS 记录。
    2. 校验源站域名解析。
    3. 确保访问域名 CNAME 指向优选域名。
    4. 确保 `saas.xx.com` 回退源 A 记录指向 `6.6.6.6`。
    5. SSL 改成 flexible。
    6. 设置 fallback origin。
    7. 创建/更新 custom hostname。
  - 返回体新增 `deployment.accessRecord`。
- `public/js/actions/speed-actions.js`
  - 成功列表记录新增 `accessRecord`，便于后续展示/管理真实加速解析。
- `test/speed-deploy.test.js`
  - 更新部署成功测试，断言访问域名 CNAME 被创建到优选域名。
  - 更新幂等测试，断言旧访问解析会被更新为优选域名 CNAME。
  - 新增 `warns when an in-zone source domain has no DNS record`：
    - 源站属于当前 zone 且没有解析时返回 `409`。
    - 断言只发生一次 DNS 列表读取，没有后续写操作。

验证：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/speed-deploy.test.js
node --test test/**/*.test.js
```

验证结果：

- 全部 JS 语法检查通过。
- 一键加速专项测试 4 项全部通过。
- 全量 Node 测试 15 项全部通过。

本地服务：

- 已重启 `http://localhost:3003`，当前 PID `14133`。
- 非破坏性接口复测：

```bash
curl -s -i -X POST http://127.0.0.1:3003/api/zones/d5e960edf95175e6f3a03f51495ff495/speed-deploy \
  -H 'Content-Type: application/json' \
  -d '{}'
```

结果：

```text
HTTP/1.1 400 Bad Request
{"error":"请输入一级域名"}
```

说明接口仍正常进入业务校验，不是 404。

重要安全边界：

- 本轮没有点击真实 `开始加速`。
- 本轮没有对真实 Cloudflare 账号执行写入。
- 源站解析警告由后端强制执行，不只是前端提示。

## 2026-06-05 一键加速访问域名不启用代理确认检查点

用户明确要求：

- 访问域名指向优选域名时不要开启小黄云。

当前实现确认：

- `src/services/cloudflare/speed-deploy-service.js`
  - `ensureAccessDnsRecord()` 创建/更新访问域名解析时使用：
    - `type: "CNAME"`
    - `content: config.optimizedDomain`
    - `proxied: false`
    - `comment: "一键加速优选域名"`
  - 因此访问域名，例如 `222.baize.host -> cdn.cnno.de`，不会开启 Cloudflare 代理小黄云。
  - 回退源 `saas.xx.com -> 6.6.6.6` 仍保持 `proxied: true`，这是另一条回退源解析。
- `test/speed-deploy.test.js`
  - 部署成功测试已断言访问域名 CNAME body 为 `proxied: false`。
  - 幂等更新测试已断言旧访问解析会被更新为 `proxied: false`。

验证：

```bash
node --check src/services/cloudflare/speed-deploy-service.js
node --check test/speed-deploy.test.js
node --test test/speed-deploy.test.js
```

验证结果：

- 语法检查通过。
- 一键加速专项测试 4 项全部通过。

## 2026-06-05 自动优化按原版蜘蛛网络实现检查点

用户需求：

- “看一下原版蜘蛛网络，把一键优化做一下”。
- 自动优化页需要照 `cococ.co` 原版蜘蛛网络 UI 和交互实现。
- 保持项目标准 Node.js 模块化设计，文件可读，不堆单文件。
- 每轮压缩/检查点继续追加交接文档。

原版对照：

- 已重新抓取 `https://cococ.co/assets/index-ktA5GlZY.js` 中的自动优化组件。
- 原版自动优化页结构包括：
  - 顶部即时生效提示。
  - `自动优化设置 Auto - 域名` 卡片。
  - 预设选择：`最优安全`、`最优速度`、`开始优化`。
  - `操作选项与安全设置`：
    - 操作代理IP
    - 拦截带?参数
    - 拦截非中国流量
    - 拦截非GET流量
    - 启用5秒盾 (Under Attack Mode)
    - 安全级别
    - 访客重验时长
    - 浏览器检查
    - 防盗链
    - Email加密
    - IPV6
    - 分层缓存
  - `缓存设置`：
    - 代码压缩 html/css/js
    - 静态文件缓存
    - 浏览器缓存时间
    - 全站缓存
    - 缓存HTML
  - `性能加速`：
    - Brotli 压缩
    - HTTP/3
    - 0-RTT
    - Rocket Loader

后端实现：

- 新增 `src/services/cloudflare/automation-definitions.js`
  - 集中定义自动优化 Cloudflare zone settings。
  - 定义安全/速度预设。
  - 定义自动优化防火墙规则：
    - `[auto-optimization] block-query-params`
    - `[auto-optimization] block-non-china-traffic`
    - `[auto-optimization] block-non-get-traffic`
  - 定义自动优化页面规则：
    - `zone/*`
    - `zone/*.html*`
- 新增 `src/services/cloudflare/automation-service.js`
  - `getState(zoneId)` 读取当前 zone、settings、DNS 代理状态、防火墙规则、页面规则、分层缓存。
  - `updateSettings(zoneId, input)` 保存单项 Cloudflare zone setting。
  - `applyPreset(zoneId, { preset })` 应用 `security` 或 `speed` 预设。
  - `updateDnsProxy(zoneId, { enabled })` 批量切换可代理 A/AAAA/CNAME 记录小黄云。
  - `updateFirewallToggle(zoneId, key, { enabled })` 幂等创建/停用自动优化防火墙规则。
  - `updatePageRuleToggle(zoneId, key, { enabled })` 幂等创建/停用自动优化页面规则。
  - `updateTieredCaching(zoneId, { enabled })` 读写 Cloudflare Tiered Cache API。
  - 读取时遇到套餐/接口不可用会返回默认状态和 warnings。
  - 批量预设应用时单项失败会继续尝试其他项目，并把失败项写入 warnings。
- 新增 `src/controllers/automation-controller.js`
  - 控制器只负责读取 JSON body 和调用 service。
- 更新 `src/bootstrap.js`
  - 注册 `AutomationService` 和 `AutomationController`。
- 更新 `src/app.js`
  - 将 `automationController` 注入 API router。
- 更新 `src/routes/api-routes.js`
  - 新增路由：
    - `GET /api/zones/:zoneId/automation`
    - `PATCH /api/zones/:zoneId/automation`
    - `POST /api/zones/:zoneId/automation/apply`
    - `PATCH /api/zones/:zoneId/automation/dns-proxy`
    - `PATCH /api/zones/:zoneId/automation/firewall/:ruleKey`
    - `PATCH /api/zones/:zoneId/automation/page-rules/:ruleKey`
    - `PATCH /api/zones/:zoneId/automation/tiered-caching`

前端实现：

- 新增 `public/js/views/automation-view.js`
  - 自动优化真实页面，不再是占位壳子。
  - 复刻原版页面结构与文案。
  - 默认使用账号第一个域名，可在页面顶部切换域名。
  - 预设选择后展示原版“安全优化将配置/速度优化将配置”列表。
  - 单项开关和选择框支持即时保存。
- 新增 `public/js/actions/automation-actions.js`
  - 负责读取自动优化状态、切换域名、应用预设、保存单项设置、切换规则。
  - 页面进入自动优化时自动加载当前域名配置。
- 更新 `public/js/api.js`
  - 新增自动优化接口封装。
- 更新 `public/js/events.js`
  - 绑定自动优化选择框、按钮、开关、压缩 chip。
- 更新 `public/js/actions.js`
  - 接入 `createAutomationActions`。
  - 主导航进入 `automation` 时触发状态加载。
- 更新 `public/js/state.js`
  - 新增自动优化状态字段：
    - `automationZoneId`
    - `automationPreset`
    - `automationState`
    - `automationLoading`
    - `automationApplying`
    - `automationNotice`
    - `automationPendingKey`
- 更新 `public/js/views/feature-view.js`
  - `state.mainSection === "automation"` 时渲染真实自动优化页。
- 新增 `public/css/features/automation.css`
  - 复刻原版紧凑后台样式：
    - 标题约 16px。
    - 设置项标题 12px。
    - 说明文字 10px。
    - 控件 24-32px 高度。
    - 卡片 8px 圆角、细边框。
- 更新 `public/styles.css`
  - 导入自动优化样式。

测试：

- 新增 `test/automation.test.js`
  - `reads automation settings and original-style toggles from Cloudflare APIs`
    - 断言自动优化读取 settings、DNS 代理、防火墙、页面规则、分层缓存状态。
  - `applies automation speed preset and continues through readable setting map`
    - 断言速度预设按原版写入：
      - `security_level: low`
      - `ssl: flexible`
      - `cache_level: aggressive`
      - `browser_cache_ttl: 31536000`
      - `polish: lossless`
      - `minify: html/css/js on`
      - `brotli: on`
      - `early_hints: on`
      - `http3: on`
  - `toggles automation firewall, page rule, DNS proxy, and tiered caching endpoints`
    - 断言规则停用、DNS 代理关闭、分层缓存开启的 Cloudflare 请求体。
  - `renders automation view with original compact controls`
    - 直接渲染前端页面，防止引用错误和占位页回归。

验证命令：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/automation.test.js
node --test test/**/*.test.js
```

验证结果：

- 全部 JS 语法检查通过。
- 自动优化专项测试 4 项全部通过。
- 全量 Node 测试 19 项全部通过。

浏览器验收：

- 已重启本地服务：

```bash
PORT=3003 node src/server.js
```

- 当前服务地址：`http://localhost:3003`
- 已通过内置浏览器进入后台并打开 `自动优化`。
- 页面读取真实账号第一个域名 `100222.xyz` 的配置成功。
- 字体采样：
  - 自动优化标题：`16px / 24px`
  - 设置项标题：`12px / 16px`
  - 设置项说明：`10px / 14px`
- 控制台错误：无。
- 已验证选择 `最优速度` 后“速度优化将配置”说明卡出现，`开始优化` 按钮变为可用。
- 没有点击 `开始优化`，没有执行真实 Cloudflare 批量写入。
- 页面截图已保存：
  - `cloudflare-automation-original-ui.png`

安全边界：

- 本轮浏览器验收只执行读取和前端预设选择。
- 没有点击真实 `开始优化`。
- 没有触发真实自动优化写入。
- 自动优化服务的写入行为只在测试 mock 中验证。

注意事项：

- 项目目录 `/Users/yanpuzhen/project/cloudflare` 当前不是 Git 仓库，`git status` 不可用。
- 自动优化规则使用固定 description/pattern 做幂等匹配，避免重复创建同类规则。
- Cloudflare 某些设置如 `polish`、`early_hints`、`tiered_cache_smart_topology_enable` 可能受套餐限制；实现会以 warnings 形式呈现。

## 2026-06-05 自动优化报错复查与一键加速自定义优选域名检查点

用户需求：

1. 检查自动优化页报错：
   - `firewall_rules: 无法连接 Cloudflare API，请检查网络或 API 地址。`
   - `tiered_caching: 无法连接 Cloudflare API，请检查网络或 API 地址。`
2. 一键加速：
   - 将 `saas.sin.fan` 放到默认优选域名位置。
   - 允许用户设置三个推荐优选域名以外的自定义优选域名。

报错复查：

- 使用本地真实接口复查：

```bash
node - <<'NODE'
const zoneId = 'd5e960edf95175e6f3a03f51495ff495';
const response = await fetch(`http://127.0.0.1:3003/api/zones/${zoneId}/automation`);
const payload = await response.json();
console.log('status', response.status);
console.log('warnings', payload.automation?.warnings || payload.error);
console.log('tiered', payload.automation?.tieredCaching);
NODE
```

- 复查结果：

```text
status 200
warnings []
tiered { supported: true, enabled: false }
```

- 浏览器复查：
  - 打开自动优化页后 `.automation-notice` 不存在。
  - `noticeText` 为空。
  - 自动优化各面板正常渲染。

报错处理：

- `src/services/cloudflare/automation-service.js`
  - `getState(zoneId)` 从多路并发读取改为顺序读取：
    - `getZone`
    - `readSettings`
    - `readDnsProxyState`
    - `readFirewallState`
    - `readPageRulesState`
    - `readTieredCaching`
  - `readPageRulesState(zoneId, zone)` 支持复用已读取 zone，避免重复请求。
  - 目的：
    - 降低首次打开自动优化页面时对 Cloudflare API 的瞬时并发。
    - 减少偶发 `无法连接 Cloudflare API` warnings。

一键加速调整：

- `public/js/constants.js`
  - `speedOptimizedDomains` 顺序调整为：
    1. `saas.sin.fan 推荐`
    2. `cdn.cnno.de`
    3. `cdn.ddeed.de`
  - `defaultSpeedForm.optimizedDomain` 因此变为 `saas.sin.fan`。
  - 新增 `defaultSpeedForm.optimizedDomainCustom = ""`。
- `public/js/views/speed-view.js`
  - 原“优选域名”下拉改为“推荐优选域名”。
  - 新增“自定义优选域名”输入框：
    - placeholder: `例如: cdn.example.com`
    - 说明：`填写后会覆盖上方推荐选项，访问域名 CNAME 将指向这里`
  - 如果已有表单值不是三个推荐域名之一，会自动回显到自定义输入。
- `public/js/actions/speed-actions.js`
  - `readSpeedForm()` 优先读取 `optimizedDomainCustom`。
  - 自定义为空时才使用下拉 `optimizedDomain`。
  - 自定义值会 trim + lowercase。
  - 新增校验：没有推荐也没有自定义时提示 `请选择或输入优选域名`。
- 后端 `src/services/cloudflare/speed-deploy-service.js`
  - 已支持任意合法域名作为 `optimizedDomain`，无需额外限制。

测试更新：

- `test/speed-deploy.test.js`
  - 新增 `allows a custom optimized domain outside the recommended list`
    - 验证自定义 `custom.optimized.example` 会写入访问域名 CNAME。
    - 访问域名仍保持 `proxied: false`。
  - 新增 `renders saas.sin.fan as default and exposes custom optimized domain input`
    - 验证默认下拉展示 `saas.sin.fan 推荐`。
    - 验证页面有“自定义优选域名”和覆盖说明。

验证命令：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/speed-deploy.test.js test/automation.test.js
node --test test/**/*.test.js
```

验证结果：

- 全部 JS 语法检查通过。
- 一键加速 + 自动优化专项测试 10 项全部通过。
- 全量 Node 测试 21 项全部通过。

浏览器验收：

- 已重启 `http://localhost:3003`，当前监听 PID `19515`。
- 一键加速页验证：

```json
{
  "selectedValue": "saas.sin.fan",
  "selectedOption": "saas.sin.fan 推荐",
  "hasCustomInput": true,
  "customPlaceholder": "例如: cdn.example.com",
  "bodyHasTip": true
}
```

- 自动优化页验证：

```json
{
  "hasNotice": false,
  "noticeText": "",
  "hasPanels": [
    "自动优化设置 Auto - 100222.xyz",
    "操作选项与安全设置",
    "缓存设置",
    "性能加速"
  ]
}
```

安全边界：

- 本轮浏览器验收没有点击 `开始优化`。
- 本轮没有触发真实一键加速部署。
- 本轮没有执行真实 Cloudflare 写入；真实接口复查仅执行自动优化 GET。

## 2026-06-05 Workers 模块接入

用户需求：

- “现在做works，看看原版怎么做的，做一下”。
- 继续按 `https://cococ.co` 原版后台风格实现 Workers 模块。
- 保持标准 Node.js 项目设计，避免单文件过大，追加交接文档。

原版功能参考：

- Workers 列表。
- `新建 Worker` 弹窗：
  - 标题：`新建 Worker`
  - 描述：`创建一个新的 Cloudflare Worker 脚本`
  - 字段：`Worker 名称`、`Worker 脚本代码`
  - 默认脚本：`addEventListener('fetch', event => { event.respondWith(new Response('Hello World!')); });`
  - 校验：名称仅允许小写字母、数字和连字符。
- `编辑 Worker: {name}` 弹窗：
  - Tab：`代码编辑`、`域名管理`
  - 代码页：保存并部署 Worker 脚本。
  - 域名页：Workers.dev 子域、路由、自定义域、资源绑定入口。

后端新增：

- `src/services/cloudflare/workers-service.js`
  - 新增 `WorkersService`。
  - 支持读取账号、解析当前账号 ID。
  - 支持：
    - `GET /accounts/{account_id}/workers/scripts`
    - `GET /accounts/{account_id}/workers/scripts/{script_name}`
    - `PUT /accounts/{account_id}/workers/scripts/{script_name}`
    - `DELETE /accounts/{account_id}/workers/scripts/{script_name}`
    - `GET/POST /accounts/{account_id}/workers/scripts/{script_name}/subdomain`
    - `GET/POST/DELETE /zones/{zone_id}/workers/routes`
    - `GET/PUT/DELETE /accounts/{account_id}/workers/domains`
  - Worker 脚本上传使用 Cloudflare multipart form-data：
    - 自动判断 `export default` module 语法和 service-worker 语法。
    - module 使用 `main_module`。
    - service-worker 使用 `body_part`。
  - 路由和自定义域按原版行为归一化：
    - 去掉 `http://` / `https://`。
    - `api` 自动扩展为 `api.{zoneName}`。
    - 路由无路径时自动补 `/*`。
    - 不属于所选区域时返回 `域名必须属于所选区域 {zoneName}`。
- `src/controllers/workers-controller.js`
  - 新增 Workers 控制器。
- `src/services/cloudflare/cloudflare-client.js`
  - 新增 `getText()` 读取 Worker 原始脚本。
  - 新增 `putMultipart()` 上传 multipart。
  - 新增 `deleteAny()` 兼容 Cloudflare Worker 删除成功时无 JSON body 的响应。
  - 抽出 `makeUrl()`、`readErrorMessage()`，不改变既有 JSON API 调用行为。
- `src/lib/request-body.js`
  - `readJsonBody()` 支持传入 `maxBytes`。
  - Workers 创建/更新脚本放宽到约 1MB，其他接口仍保持默认 64KB。
- `src/bootstrap.js`、`src/app.js`、`src/routes/api-routes.js`
  - 注入 Workers service/controller。
  - 新增本地面板 API：
    - `GET /api/workers`
    - `POST /api/workers`
    - `GET /api/workers/:scriptName`
    - `PUT /api/workers/:scriptName`
    - `DELETE /api/workers/:scriptName`
    - `POST /api/workers/:scriptName/subdomain`
    - `GET /api/workers/:scriptName/routes?zoneId=...`
    - `POST /api/workers/:scriptName/routes`
    - `DELETE /api/workers/:scriptName/routes/:routeId?zoneId=...`
    - `GET /api/workers/:scriptName/domains`
    - `PUT /api/workers/:scriptName/domains`
    - `DELETE /api/workers/:scriptName/domains/:domainId`

前端新增：

- `public/js/views/workers-view.js`
  - 新增 Workers 真实页面，替代原占位卡片。
  - 顶部账号选择、刷新、新建按钮。
  - Worker 列表展示名称、ETag、修改时间、自定义域数量。
  - 创建弹窗、编辑弹窗、删除确认弹窗。
  - 编辑弹窗内含：
    - `代码编辑`
    - `域名管理`
    - `Workers.dev 子域`
    - `路由`
    - `自定义域`
    - `资源绑定`
- `public/js/actions/workers-actions.js`
  - 新增 Workers 页面状态加载、创建、编辑、保存脚本、workers.dev 开关、路由新增/删除、自定义域新增/删除、删除 Worker 二次确认。
  - 删除路由和自定义域使用浏览器确认框，避免误写真实 Cloudflare 资源。
- `public/css/features/workers.css`
  - 新增 Workers 专属样式。
  - 字体控制在原版后台风格的 11px-16px 范围。
  - 面板和弹窗使用 8px 或更小圆角。
- `public/js/api.js`
  - 新增 Workers API 封装。
- `public/js/state.js`
  - 新增 Workers 状态字段和 `resetWorkersState()`。
- `public/js/actions.js`、`public/js/events.js`、`public/js/views/feature-view.js`、`public/styles.css`
  - 接入 Workers actions、事件、视图入口和 CSS。

测试新增：

- `test/workers.test.js`
  - `manages Workers scripts, subdomain, routes, and custom domains through Cloudflare APIs`
    - 验证列表、详情、multipart 上传、workers.dev、路由、自定义域、删除 Worker 的 API 路径。
  - `rejects Worker route patterns outside the selected zone`
    - 验证路由不属于所选 zone 时后端 400，且不会调用 Cloudflare 创建路由。
  - `renders Workers view with original-style modal text and compact domain manager`
    - 验证页面包含原版关键文案和域名管理结构。

验证命令：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/workers.test.js
node --test test/**/*.test.js
```

验证结果：

- 全部 JS 语法检查通过。
- Workers 专项测试 3 项全部通过。
- 全量 Node 测试 24 项全部通过。

安全边界：

- 浏览器验收只允许打开 Workers 页面、刷新/读取列表、查看弹窗。
- 不点击 `创建 Worker`、`保存并部署`、`添加路由`、`添加自定义域`、`删除` 等真实写入按钮。

## 2026-06-05 Workers 模块收尾与原版对齐

用户要求“现在做 works，看看原版怎么做的，做一下”。本次在已有 Workers 后端和前端基础上做收尾验收，并按 cococ.co 线上打包资源确认原版 Workers 结构。

原版对照：

- 访问 `https://cococ.co/` 当前入口可见打包资源：
  - `/assets/index-ktA5GlZY.js`
  - `/assets/index-CpSmGiz8.css`
- 用线上 JS 片段确认原版 Workers 关键结构：
  - 侧边栏标题：`Workers`
  - 顶部标题：`Workers 管理`
  - 列表卡片：`Workers 列表`
  - 列表说明：`查看和管理您的 Cloudflare Workers`
  - 空态：`暂无 Workers`
  - 创建弹窗：`新建 Worker`、`创建一个新的 Cloudflare Worker 脚本`
  - 编辑弹窗：`编辑 Worker: {name}`、`修改Worker脚本代码、路由和 workers.dev 子域设置`
  - Tab：`代码编辑`、`域名管理`
  - 域名管理：`Workers.dev 子域`、`路由`、`自定义域`

本次微调：

- `public/js/views/workers-view.js`
  - 拆成页面组装入口，只保留 `renderWorkersView()`。
  - 继续通过 `renderShell()` 接入现有后台外壳。
- 新增 `public/js/views/workers/helpers.js`
  - 集中 Workers 页面公共状态读取和 option/notice 渲染。
- 新增 `public/js/views/workers/list-view.js`
  - 承担顶部工具栏、统计卡片、Workers 列表和空态。
  - 将列表标题从 `Worker 脚本` 对齐为原版 `Workers 列表`。
  - 将空态从 `暂无 Worker` 对齐为原版 `暂无 Workers`。
- 新增 `public/js/views/workers/domain-manager-view.js`
  - 承担 `Workers.dev 子域`、`路由`、`自定义域`、`资源绑定` 四个域名管理区块。
- 新增 `public/js/views/workers/modals-view.js`
  - 承担创建、编辑、删除三个弹窗。
- 行为层 `public/js/actions/workers-actions.js` 未做写操作改动，避免扩大真实 Cloudflare 写接口回归面。

验证：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/workers.test.js
node --test test/**/*.test.js
curl -s -i http://127.0.0.1:3003/api/workers
```

结果：

- JS 语法检查通过。
- Workers 专项测试 3 项全部通过。
- 全量 Node 测试 24 项全部通过。
- 本地真实读取 `GET /api/workers` 返回 200：
  - 账号：`Heichi233@gmail.com's Account`
  - 当前 Workers 列表为空：`workers: []`
  - 无 warnings。

浏览器只读验收：

- 地址：`http://localhost:3003/`
- 已进入 Workers 页面。
- 顶部标题：`Workers`
- 侧边栏 Workers active 状态正常。
- 列表标题：`Workers 列表`
- 空态：`暂无 Workers`
- 创建按钮可见且未禁用。
- 控制台 error：无。
- 字体抽样：
  - 工具栏标题：`16px`
  - 列表标题：`16px`
  - 空态标题：`14px`
  - 按钮：`12px`

后续建议：

- 若继续按原版补 Workers 子功能，优先顺序可以是：
  - Worker 详情页
  - D1 / KV / R2 绑定弹窗
  - 环境变量管理
  - Worker 模板库
- 真实写操作浏览器验收仍需用户明确允许后再点击，默认只读验证。

## 2026-06-05 开发资源模块接入：Pages / D1 / R2 / KV / 模板库 / Tunnels

用户要求把侧栏截图中的开发资源项继续做完：`Pages`、`D1 数据库`、`R2 存储桶`、`Workers KV`、`Worker 模板库`、`Cloudflare Tunnels`。本次在已完成的 Workers 模块旁边追加统一的开发资源管理模块，继续保持 cococ.co/蜘蛛网络后台的小字号、紧凑表格、8px 内圆角风格。

后端新增：

- `src/services/cloudflare/developer-resources-service.js`
  - 统一管理 Pages、D1、R2、KV、Tunnels 的账号解析、分页读取、创建、删除和返回格式规范化。
  - 先读取 `/accounts`，默认使用当前凭据可访问的第一个 Account，也支持前端切换 accountId。
  - 支持 Cloudflare 分页的 `page/result_info.total_pages` 和 cursor 风格返回。
  - R2 名称按 Cloudflare 规则收紧为小写字母、数字、连字符，长度 3-63。
  - Tunnel 创建自动生成 32 字节 base64 `tunnel_secret`，前端不需要也不会暴露密钥输入。
- `src/controllers/developer-resources-controller.js`
  - 提供统一 list/create/delete 控制器，并保留服务端参数校验。
- `src/routes/api-routes.js`
  - 新增 `GET /api/developer-resources/:type`
  - 新增 `POST /api/developer-resources/:type`
  - 新增 `DELETE /api/developer-resources/:type/:resourceId`
- `src/bootstrap.js`
  - 注入 `DeveloperResourcesService` 和 `DeveloperResourcesController`。

Cloudflare API 对应关系：

- Pages：`/accounts/{account_id}/pages/projects`
- D1：`/accounts/{account_id}/d1/database`
- R2：`/accounts/{account_id}/r2/buckets`
- Workers KV：`/accounts/{account_id}/storage/kv/namespaces`
- Cloudflare Tunnels：`/accounts/{account_id}/cfd_tunnel`

前端新增：

- `public/js/views/developer-resources-view.js`
  - 统一渲染 Pages、D1、R2、KV、Tunnels 的资源列表、账号选择、统计摘要、新建弹窗和删除确认弹窗。
  - 删除真实资源需要输入资源名称二次确认。
  - Worker 模板库为本地前端模板库，不调用 Cloudflare 写接口。
- `public/js/actions/developer-resources-actions.js`
  - 接入资源加载、账号切换、新建、删除、模板保存/删除/使用。
  - Worker 模板保存到 `localStorage`，key 为 `cloudflare-panel-worker-templates`。
  - 使用模板只把脚本带入 Workers 的新建弹窗，不直接创建真实 Worker。
- `public/css/features/developer-resources.css`
  - 新增开发资源页专属样式，字号控制在 11px-16px，按钮 12px，列表紧凑。
- 既有接线：
  - `public/js/api.js`
  - `public/js/state.js`
  - `public/js/actions.js`
  - `public/js/events.js`
  - `public/js/views/feature-view.js`
  - `public/js/views/workers/modals-view.js`
  - `public/styles.css`

内置 Worker 模板：

- `Hello World`
- `JSON API`
- `缓存反代`

本次额外修复：

- `src/server.js`
  - 启动日志改为打印实际监听端口：`http://127.0.0.1:{port}`。
  - 修复 `PORT=0` 自动分配端口时日志仍显示 `localhost:0`，导致测试等待错误端口的问题。
- `src/config/env.js`
  - 新增端口解析逻辑，允许 `PORT=0` 用于测试随机空闲端口。
  - 请求超时等配置仍使用正数校验，避免放宽无关边界。

测试新增：

- `test/developer-resources.test.js`
  - `manages developer platform resources through Cloudflare APIs`
    - 覆盖 Pages、D1、R2、KV、Tunnels 的 list/create/delete API 路径和请求体。
    - 验证 Tunnel 自动生成 `tunnel_secret`。
    - 验证 R2 创建使用 `POST /accounts/{accountId}/r2/buckets`。
  - `renders developer resource pages and Worker template library`
    - 覆盖 R2 页面关键文案。
    - 覆盖 Worker 模板库内置模板和自定义模板渲染。

验证命令：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/developer-resources.test.js
node --test test/**/*.test.js
```

验证结果：

- JS 语法检查通过。
- 开发资源专项测试 2 项全部通过。
- 全量 Node 测试 26 项全部通过。

安全边界：

- 浏览器验收默认只读：允许打开 Pages/D1/R2/KV/Templates/Tunnels 页面、刷新列表、查看弹窗。
- 不点击 `创建`、`删除` 等真实写入按钮。
- Worker 模板库的“使用模板”只切到 Workers 新建弹窗并填入脚本，不会自动创建 Worker。

后续建议：

- Pages 后续可继续补部署列表、构建配置、自定义域绑定。
- D1 后续可补表列表、查询控制台、Worker 绑定。
- R2 后续可补对象列表、上传、公开访问/自定义域。
- KV 后续可补 key/value 读取、编辑、过期时间。
- Tunnels 后续可补 connector token 展示、ingress 规则、运行状态详情。

## 2026-06-05 剩余功能集中实现：SSL/TLS、证书、WAF、统计、Workers 深层、资源深层、一键加速管理

用户要求把此前列出的未实现项继续补齐。本次按现有原生 Node.js 项目结构继续拆分服务、控制器、视图和样式，保持服务器端管理 Cloudflare Global API Key，前端不暴露敏感凭据。

后端新增/扩展：

- `src/services/cloudflare/ssl-settings-service.js`
  - 新增真实 SSL/TLS 设置读取和更新。
  - 支持 `ssl`、`always_use_https`、`automatic_https_rewrites`、`min_tls_version`、`tls_1_3`、`opportunistic_encryption`、`websockets`、`http3`。
- `src/controllers/ssl-settings-controller.js`
  - 新增 `GET/PATCH /api/zones/:zoneId/ssl-settings`。
- `src/services/cloudflare/certificates-service.js`
  - 自定义证书上传：`POST /zones/{zone_id}/custom_certificates`。
  - Origin CA 列表/创建/删除：`GET/POST /certificates`、`DELETE /certificates/{id}`。
  - 私钥只提交到后端转发给 Cloudflare，不回传到前端状态。
- `src/services/cloudflare/firewall-rules-service.js`
  - 保留旧版 Firewall Rules CRUD。
  - 新增 Rulesets entrypoint 读取、创建 WAF 自定义规则、Rate Limiting/防 CC 规则、删除/更新 Ruleset rule。
  - 新增 phase：`http_request_firewall_custom`、`http_ratelimit`。
- `src/services/cloudflare/analytics-service.js`
  - 支持自定义 `startDate/endDate`，最大 90 天。
  - 新增安全事件采样读取 `firewallEventsAdaptiveGroups`，失败时降级为 warnings。
- `src/services/cloudflare/workers-service.js`
  - Worker 详情新增读取 schedules、deployments、secrets、queues。
  - 新增 settings/bindings 更新、Secret 创建/删除、Cron Triggers 覆盖保存、Tail 会话创建、Queues 列表。
- `src/services/cloudflare/developer-resources-service.js`
  - Pages：详情、部署记录、自定义域、构建配置保存。
  - D1：详情、表列表、SQL 查询。
  - R2：桶详情、对象列表、文本对象上传、对象删除。
  - KV：命名空间详情、Key 列表、Value 读取/保存/删除。
  - Tunnels：详情、configuration 读取/保存、connector token 按需读取。
- `src/services/cloudflare/speed-deploy-service.js`
  - 已加速域名列表改为真实同步 Cloudflare DNS 备注和 custom hostnames。
  - 删除加速域名改为删除面板管理的访问域名 CNAME 与对应 SaaS custom hostname。
  - 不自动删除共享回退源，避免误伤其它加速域名。
- `src/services/cloudflare/cloudflare-client.js`
  - 新增 `getRaw/postRaw/putRaw/sendRaw`，支持 KV/R2 原始文本或对象内容。
  - 修复 Cloudflare `204 No Content` 成功响应被当作错误的边界条件。

前端新增/扩展：

- `public/js/views/zone/ssl-view.js`
  - 新增真实 SSL/TLS 设置页，替换原静态壳子。
  - 模式卡片、最低 TLS 版本、HTTPS/TLS/WebSockets/HTTP3 等开关都接真实 API。
- `public/js/views/zone/certificates-view.js`
  - 自定义证书上传表单可用。
  - Origin CA 创建表单、最近创建证书展示、Origin CA 列表/删除可用。
- `public/js/views/zone/firewall-view.js`
  - 新增 WAF / Rate Limiting 规则创建区。
  - 新增 Rulesets 规则列表和删除。
  - 旧版 Firewall Rules 区保留。
- `public/js/views/zone/analytics-view.js`
  - 新增自定义日期范围查询。
  - 新增安全事件采样列表和 warnings 展示。
- `public/js/views/workers/domain-manager-view.js`
  - 新增资源绑定、Secret、Cron Triggers、部署记录、Tail 会话入口。
- `public/js/views/developer-resources-view.js`
  - 资源列表新增“管理”按钮。
  - 新增详情面板，按 Pages/D1/R2/KV/Tunnels 渲染深层操作。
- `public/js/actions/*.js`、`public/js/api.js`、`public/js/events.js`、`public/js/state.js`
  - 接入上述新增 API、状态字段和事件绑定。
- CSS：
  - `public/css/zone/settings.css`
  - `public/css/zone/certificates.css`
  - `public/css/zone/firewall.css`
  - `public/css/zone/analytics.css`
  - `public/css/features/workers.css`
  - `public/css/features/developer-resources.css`
  - 新增区域控制在紧凑后台字号，按钮 12px-14px，卡片圆角保持 8px。

测试新增/更新：

- 新增 `test/advanced-cloudflare.test.js`
  - 覆盖 SSL 设置读写。
  - 覆盖自定义证书上传和 Origin CA 创建。
  - 覆盖新版 Rulesets rule 创建。
  - 覆盖一键加速真实列表和删除。
- 更新 `test/smoke.test.js`
  - Analytics 增加安全事件 GraphQL 查询断言。
  - 证书状态增加 Origin CA 读取 warning/请求断言。
- 更新 `test/workers.test.js`
  - Worker 详情增加 schedules、deployments、secrets、queues 深层读取断言。

验证命令：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/**/*.test.js
```

验证结果：

- JS 语法检查通过。
- 全量 Node 测试 27 项全部通过。

安全边界：

- 浏览器验收仍默认只读，不点击会对真实 Cloudflare 写入的按钮。
- 自定义证书私钥不会写入前端状态，不会在列表中回显。
- Tunnel token 只在用户点击“读取 Token”时请求，不随默认详情读取。
- 一键加速删除仅删除有面板备注/匹配的托管资源，不清理共享 `saas.{zone}` 回退源。

后续可继续精修：

- Rulesets 更新/启停 UI 目前主要支持创建和删除，后续可补编辑/暂停。
- Workers Tail 当前是会话创建入口，后续可补真实日志流视图。
- R2 对象上传当前前端为文本内容入口，后续可补文件选择和 multipart 上传。
- D1 查询参数化输入、结果表格化展示可继续增强。

## 2026-06-05 收口验收与开源仓库入口修正

本次在剩余功能集中实现后继续做运行态收口，重点检查真实页面能否打开、字号是否保持紧凑、开源仓库入口是否正确，以及提交前敏感信息边界。

补丁内容：

- `public/js/constants.js`
  - 新增 `githubIssueUrl` 常量，统一维护需求开发跳转地址。
- `public/js/views/shell-view.js`
  - 侧栏“需求开发”入口改为当前开源仓库：
    `https://github.com/baize-projects/network/issues/new`。
- `README.md`
  - 同步更新 GitHub Issues 地址，避免文档仍指向旧仓库。
- `public/css/dns/summary.css`
  - 单域名摘要标题从 24px 压到 18px，匹配原版紧凑后台字号。
- `public/css/responsive.css`
  - 移动端 DNS 表单标题从 26px 压到 20px，避免 DNS/SSL/TLS/缓存相关页面标题过大。

本地服务：

```bash
PORT=3003 node src/server.js
```

说明：当前环境没有 `npm` 命令，但项目是无依赖原生 Node.js 项目，使用 `node src/server.js` 可以直接运行。

验证命令：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/**/*.test.js
git diff --check
```

验证结果：

- JS 语法检查通过。
- Node test 全量 27 项全部通过。
- `git diff --check` 通过，无尾随空白等补丁格式问题。
- 浏览器只读验收通过：
  - 登录页只显示脱敏账号，不暴露 Global API Key。
  - 域名列表能读取真实 Zone。
  - 单域名 DNS、SSL/TLS、证书管理、防火墙、统计分析、缓存、页面规则均可打开，无横向溢出。
  - 一键加速、Workers、Pages、D1、R2、KV、Tunnels、自动优化均可打开，无浏览器 console error。
  - 一键加速默认优选域名为 `saas.sin.fan`，并保留自定义优选域名输入。
  - Workers 编辑页能打开，代码编辑/域名管理标签正常展示。

安全边界：

- 本轮浏览器验收只读，不提交 Cloudflare 写操作表单。
- `.env`、`.env.*`、根目录截图继续被 `.gitignore` 排除。
- 提交前需要继续确认不暂存真实 Cloudflare 凭据或私钥。

## 2026-06-05 操作历史实现

用户要求把侧栏“操作历史”做成可用功能。本次实现为服务端内存审计日志，所有面板内 `POST/PATCH/PUT/DELETE` 写操作统一经过 API 路由审计，不需要在每个控制器里重复记录。

后端新增/扩展：

- `src/services/operation-history-service.js`
  - 新增内存操作历史服务，默认最多保留 300 条。
  - 自动识别模块：DNS 记录、SSL/TLS、缓存管理、防火墙、页面规则、证书管理、一键加速、自动优化、Workers、Pages、D1、R2、KV、Tunnels、账号连接。
  - 记录字段包含：时间、方法、动作、模块、路径、资源、状态、HTTP 状态码、耗时、错误信息。
  - 不保存请求体，避免证书私钥、Worker Secret、Global API Key 等敏感字段进入历史。
  - 修复 `limit` 为空时被 `Number(null)` 压成 1 的边界，空值现在走默认 80。
- `src/controllers/operation-history-controller.js`
  - 新增 `GET /api/operation-history`，支持 `module/status/limit` 筛选。
  - 新增 `DELETE /api/operation-history` 清空当前服务进程内历史。
- `src/routes/api-routes.js`
  - 写接口统一包裹审计逻辑。
  - 成功和失败都会记录。
  - `/api/operation-history` 自身不写入历史，避免清空后立刻产生新记录。
- `src/bootstrap.js`、`src/app.js`
  - 接入 `OperationHistoryService` 和 `OperationHistoryController`。

前端新增/扩展：

- `public/js/views/history-view.js`
  - 新增紧凑后台风格操作历史页。
  - 包含统计卡片、模块筛选、结果筛选、条数选择、刷新、清空和最近操作表格。
- `public/js/actions/history-actions.js`
  - 新增加载、筛选、清空操作历史动作。
- `public/js/api.js`
  - 新增 `fetchOperationHistory()`、`clearOperationHistory()`。
- `public/js/state.js`
  - 新增操作历史状态和重置逻辑。
- `public/js/actions.js`、`public/js/events.js`、`public/js/views/feature-view.js`
  - 将侧栏“操作历史”从占位页切到真实页面，并接入事件。
- `public/css/features/history.css`、`public/styles.css`
  - 新增操作历史样式，字号保持 11px-16px 的紧凑后台比例。

测试新增：

- `test/operation-history.test.js`
  - 覆盖成功写操作进入历史。
  - 覆盖失败写操作进入历史。
  - 覆盖模块/状态筛选。
  - 覆盖清空历史不会留下“清空历史”记录。
  - 覆盖历史响应不包含请求体敏感内容。
  - 覆盖操作历史页渲染，不退回占位壳子。

验证命令：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/**/*.test.js
git diff --check
```

验证结果：

- JS 语法检查通过。
- Node test 全量 29 项全部通过。
- `git diff --check` 通过。

运行说明：

- 操作历史当前是进程内存数据，重启 `node src/server.js` 后会清空。
- 后续如果需要长期审计，可将 `OperationHistoryService` 的存储替换为文件或 SQLite，前端 API 不需要改。

## 2026-06-05 部署文档与完整功能调试

用户要求新增部署文档，并在部署完成后进行一次完整功能调试。本次新增独立部署手册，并基于当前工作区代码重启本地 3003 服务做只读浏览器验收。

文档新增/调整：

- 新增 `DEPLOYMENT.md`
  - 记录 Node.js 运行要求、代码获取、`.env` 配置、本地启动、生产启动。
  - 补充 systemd 服务示例、Nginx 反向代理示例、部署后健康检查。
  - 补充升级、回滚、安全边界和常见故障排查。
  - 明确当前项目无第三方依赖；没有 `npm` 时可以直接用 `node src/server.js`。
  - 明确 Cloudflare Global API Key 只应保存在服务端 `.env`，不得提交。
- 更新 `README.md`
  - 在运行说明末尾增加 `DEPLOYMENT.md` 链接，避免 README 承载过长部署细节。

本地部署：

```bash
PORT=3003 node src/server.js
```

当前服务：

- 访问地址：`http://127.0.0.1:3003/`
- 健康检查：`curl -I http://127.0.0.1:3003/` 返回 `HTTP/1.1 200 OK`
- 会话检查：`curl http://127.0.0.1:3003/api/session/status` 返回 `hasCredentials: true` 和脱敏邮箱，未返回 Global API Key。

验证命令：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/**/*.test.js
git diff --check
```

验证结果：

- JS 语法检查通过。
- Node test 全量 29 项全部通过。
- `git diff --check` 通过。
- 敏感信息扫描命中项仅为证书上传输入框占位符和测试假私钥片段，不是真实凭据。

浏览器完整只读调试结果：

- 登录页：
  - 能识别服务端 `.env` 凭据。
  - 只显示脱敏邮箱。
  - “快速进入”可进入后台。
- 全局功能：
  - 域名管理：真实 Zone 列表可加载。
  - 一键加速：页面可打开，默认流程壳子可见。
  - SaaS优选、免费域名：仿站壳子可打开。
  - 自动优化：真实设置页面可打开。
  - 操作历史：真实历史页可打开，筛选、刷新、清空入口可见。
  - Workers：列表页可打开。
  - Pages、D1、R2、Workers KV、Worker 模板库、Cloudflare Tunnels：资源页可打开。
  - 需求开发入口指向 `https://github.com/baize-projects/network/issues/new`。
- 单域名管理：
  - 使用 `100222.xyz` 做只读巡检。
  - DNS 记录、SSL/TLS、缓存管理、防火墙、统计分析、页面规则、证书管理均可打开。
  - 单域名页面标题、按钮和主要区域正常渲染。
- 浏览器调试结论：
  - 控制台无 JavaScript error。
  - 全局功能页和单域名管理页均无横向溢出。
  - 本轮没有提交新增、编辑、删除、清缓存、证书创建、Worker 部署等真实 Cloudflare 写操作。

注意事项：

- 当前环境没有 `npm` 命令，但项目无依赖，使用 `node src/server.js` 和 `node --test test/**/*.test.js` 均可正常运行。
- 操作历史是内存数据，本次重启 3003 服务后历史会从空状态重新记录。
- `DEPLOYMENT.md` 中的 systemd 单元文件是示例，实际部署时需按服务器项目路径和 Node 路径调整。

## 2026-06-05 前端凭据登录 Cookie 会话与 Key 安全加固

用户要求支持“以前端页面输入 key 和邮箱的方式登录，在浏览器上登录过，保存登录 cookies 30 天”，并增加 Cookie 报错与 Key 安全检查。本次实现为服务端内存会话 + 浏览器 HttpOnly Cookie，不把 Global API Key 写入浏览器可读位置。

后端新增/调整：

- 新增 `src/services/credential-session-service.js`
  - 登录成功后生成随机 `cf_panel_session` 会话 ID。
  - Cookie 默认 `Max-Age=2592000`，即 30 天。
  - Cookie 属性包含 `HttpOnly`、`SameSite=Lax`、`Path=/`。
  - `NODE_ENV=production`、`SECURE_COOKIES=true` 或 `X-Forwarded-Proto: https` 时自动加 `Secure`。
  - Cookie 内只保存随机会话 ID，不保存邮箱和 Global API Key。
  - 邮箱和 Global API Key 只保存在当前 Node.js 进程内存会话中。
- `src/services/cloudflare/cloudflare-client.js`
  - 新增请求级凭据上下文，基于 `AsyncLocalStorage` 在单次 API 请求内使用 Cookie 会话凭据。
  - 保留 `.env` 服务端凭据作为 fallback，避免破坏原有快速进入。
  - 前端输入凭据不再写入全局 Cloudflare 客户端，避免多用户互相覆盖。
- `src/controllers/credentials-controller.js`
  - `GET /api/session/status` 返回：
    - `source: "cookie"`：浏览器 Cookie 会话。
    - `source: "server"`：服务端 `.env` 凭据。
    - `expiresAt`：Cookie 会话过期时间。
  - `POST /api/session/connect`：
    - 表单提交完整邮箱和 Global API Key 时创建 30 天 Cookie 会话。
    - 空表单继续支持服务端 `.env` 快速进入，不下发 Cookie。
    - 响应体只返回脱敏邮箱、会话来源和过期时间，不返回 Key。
  - 新增 `POST /api/session/logout`，清理服务端会话并下发过期 Cookie。
- `src/routes/api-routes.js`
  - 所有 API 请求会先从 `cf_panel_session` Cookie 解析当前会话凭据，再进入业务控制器。
  - 操作历史仍不保存请求体，避免 Key、证书私钥、Worker Secret 等敏感信息进入历史。
- `src/config/env.js`、`.env.example`
  - 新增 `SESSION_TTL_DAYS=30`。
  - 新增 `SECURE_COOKIES=false` 示例。

前端新增/调整：

- `public/js/api.js`
  - 新增 `logoutCloudflareAccount()`。
- `public/js/actions/session-actions.js`
  - 页面加载时如果 `/api/session/status` 返回 `source: "cookie"`，自动进入后台并加载 Zone。
  - 用户以前端输入邮箱和 Key 登录后，会再次调用 `/api/session/status` 验证浏览器已保存 Cookie。
  - 如果 Cookie 被浏览器拦截，显示：`浏览器未能保存登录 Cookie，请允许本站 Cookie 后重新登录。`
  - 输入凭据登录后如加载 Zone 失败，会调用退出接口清理刚创建的会话 Cookie，避免坏凭据长期残留。
  - 点击“退出”现在会请求 `POST /api/session/logout`，清理服务端会话和浏览器 Cookie。
- `public/js/views/connect-view.js`、`public/css/connect.css`
  - 登录页新增“安全保存方式”提示：
    - 浏览器只保存 HttpOnly Cookie。
    - Cookie 内不包含邮箱或 Global API Key。
    - 真实 Key 只保存在当前 Node.js 服务端会话中，最长 30 天，退出登录立即清除。

测试新增/扩展：

- `test/smoke.test.js`
  - 新增 `stores browser credential logins in HttpOnly session cookies without exposing keys`。
  - 覆盖：
    - 无 `.env` 凭据时初始状态为未登录。
    - 前端输入凭据登录会下发 `cf_panel_session`。
    - Cookie 有 `HttpOnly`、`SameSite=Lax`、`Max-Age=2592000`。
    - Cookie 和响应体都不包含邮箱或 Global API Key。
    - 带 Cookie 的 `/api/zones` 请求使用前端输入的邮箱和 Key。
    - 不带 Cookie 时不会误用前端输入凭据。
    - `POST /api/session/logout` 会下发 `Max-Age=0` 并撤销会话。

文档更新：

- `README.md`
  - 安全说明补充 30 天 HttpOnly Cookie 会话与 Key 不落浏览器。
- `DEPLOYMENT.md`
  - 增加 `SESSION_TTL_DAYS`、`SECURE_COOKIES`。
  - 增加 Cookie 健康检查、安全边界和 Cookie 保存失败排查。

验证命令：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/**/*.test.js
git diff --check
```

验证结果：

- JS 语法检查通过。
- Node test 全量 30 项全部通过。
- `git diff --check` 通过。

安全边界：

- 本次实现没有把 Global API Key 放入 Cookie、localStorage、sessionStorage、前端响应体或操作历史。
- Cookie 会话是进程内存会话；Node 重启后需要重新登录，这是为了避免把 Global API Key 持久化到磁盘。
- 如果生产环境启用 `Secure` Cookie，必须通过 HTTPS 访问，否则浏览器不会保存 Cookie，前端会显示 Cookie 保存失败提示。

## 2026-06-05 GitHub Actions 发布 pages 分支

用户要求先把代码推到 `baize-projects/network.git`，由 workflow 自动构建，构建完成后创建 `pages` 分支并部署到 GitHub Pages。本次新增 GitHub Actions 自动发布静态 Pages 分支。

新增/调整：

- 新增 `.github/workflows/publish-pages-branch.yml`
  - 触发条件：
    - 推送 `main`。
    - 手动 `workflow_dispatch`。
  - 权限：`contents: write`，用于把构建产物推送到 `pages` 分支。
  - 构建流程：
    - `actions/checkout@v4`
    - `actions/setup-node@v4`，Node 版本 `24`
    - `find src public/js test -name '*.js' -print -exec node --check {} \;`
    - `node --test test/**/*.test.js`
    - 将 `public/` 复制到 `_site/`
    - 添加 `_site/.nojekyll`
    - 在 `_site/` 内初始化临时 git 仓库，强制推送到远端 `pages` 分支
- GitHub Pages 子路径兼容：
  - `public/index.html`
    - `/assets/spider-icon.png` 改为 `./assets/spider-icon.png`
    - `/styles.css` 改为 `./styles.css`
    - `/app.js` 改为 `./app.js`
  - `public/js/views/connect-view.js`
    - 品牌图标改为 `assets/spider-icon.png`
  - `public/js/views/shell-view.js`
    - 品牌图标改为 `assets/spider-icon.png`

本地验证：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/**/*.test.js
git diff --check
rg -n 'src="/|href="/assets|href="/styles|src="/app|url\(/' public .github/workflows/publish-pages-branch.yml
```

验证结果：

- JS 语法检查通过。
- Node test 全量 30 项全部通过。
- `git diff --check` 通过。
- 静态资源绝对路径扫描无命中，适配项目 Pages 地址 `/network/`。

注意事项：

- GitHub Pages 只能托管静态文件。当前 `public/` 前端会被发布到 Pages，但 Cloudflare 管理 API 仍依赖 Node.js 服务端，Pages 站点本身不能直接执行真实管理功能。
- 部署后需要在 GitHub Pages 设置里把 source 指向 `pages` 分支根目录。若仓库未开启 Pages，需通过 GitHub API 或仓库设置启用。

## 2026-06-05 修复 GitHub Pages 样式丢失

用户反馈 `https://baize-projects.github.io/network/` 打开后样式丢失。排查后确认 `public/index.html` 已改成相对资源路径，但 CSS 聚合文件内部仍使用根路径 `@import url("/css/...")`，在 GitHub Pages 项目路径 `/network/` 下会请求到站点根目录 `/css/...`，导致后续样式文件 404。

修复内容：

- `public/styles.css`
  - 所有 `@import url("/css/...")` 改为 `@import url("./css/...")`。
- `public/css/dns.css`
  - DNS 子样式从 `/css/dns/...` 改为 `./dns/...`。
- `public/css/components.css`
  - 组件子样式从 `/css/components/...` 改为 `./components/...`。
- `public/css/zone.css`
  - 单域名管理子样式从 `/css/zone/...` 改为 `./zone/...`。

验证命令：

```bash
find src public/js test -name '*.js' -print -exec node --check {} \;
node --test test/**/*.test.js
rg -n '@import url\("/|href="/assets|href="/styles|src="/app|src="/' public .github README.md HANDOFF.md
```

验证结果：

- JS 语法检查通过。
- Node test 全量 30 项全部通过。
- CSS 和入口静态资源扫描确认没有影响 GitHub Pages 子路径的绝对引用。

线上验证：

- `Build and Publish Pages Branch` run `27017506075` 成功。
- `pages-build-deployment` run `27017518005` 成功。
- `https://baize-projects.github.io/network/styles.css` 已返回相对 `@import url("./css/...")`。
- `https://baize-projects.github.io/network/css/base.css` 返回 `200`。
- in-app browser 复查首屏时样式已恢复，字体为系统 UI 字体，背景为 `rgb(248, 250, 252)`，品牌标题显示为“蜘蛛网络”。

## 2026-06-05 GitHub Pages 静态环境 API 错误降级

线上复查样式时发现 GitHub Pages 静态站点没有 Node.js API 后端，`/api/session/status` 会返回 HTML，旧前端会把 HTML 当 JSON 解析并在登录页显示 `Unexpected token '<'`。这不是样式问题，但会让 Pages 首屏看起来像运行错误，因此一并修复。

修复内容：

- `public/js/api.js`
  - 新增 `ApiUnavailableError`。
  - `readJson()` 先检查 `Content-Type` 是否为 JSON；非 JSON 响应统一转换为“当前页面未连接 Node.js 后端，请在 Node 服务部署地址打开后再登录。”。
  - 避免把浏览器原生 JSON 解析错误暴露给用户。
- `public/js/actions/session-actions.js`
  - 启动时 `checkSession()` 遇到 `ApiUnavailableError` 静默处理，保持 GitHub Pages 登录首屏干净。
  - 用户主动点击登录时仍显示需要 Node 后端的中文提示。
- `test/frontend-api.test.js`
  - 覆盖非 JSON 静态 Pages 响应。
  - 覆盖启动 session 检查不显示错误。
  - 覆盖手动登录时显示 Node 后端缺失提示。

验证命令：

```bash
node --test test/frontend-api.test.js
find src public/js test -name '*.js' -print -exec node --check {} \;
```

验证结果：

- 新增前端 API 边界测试 3 项通过。
- JS 语法检查通过。
