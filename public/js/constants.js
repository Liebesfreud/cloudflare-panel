export const githubIssueUrl = "https://github.com/baize-projects/network/issues/new";

export const navItems = [
  ["domain", "globe", "域名管理"],
  ["speed", "zap", "一键加速"],
  ["saas", "shield", "SaaS优选"],
  ["free", "cloud", "免费域名"],
  ["automation", "settings", "自动优化"],
  ["history", "history", "操作历史"],
  ["workers", "grid", "Workers"],
  ["pages", "file", "Pages"],
  ["d1", "database", "D1 数据库"],
  ["r2", "archive", "R2 存储桶"],
  ["kv", "key", "Workers KV"],
  ["templates", "code", "Worker 模板库"],
  ["tunnels", "network", "Cloudflare Tunnels"],
  ["needs", "message", "需求开发"],
];

export const navFeatureMeta = {
  speed: {
    title: "一键加速域名配置",
    description: "配置访问域名、源站域名、缓存时间和优选域名。",
    badge: "CDN",
    fields: ["访问域名", "源站域名", "缓存时间（秒）", "优选域名"],
  },
  saas: {
    title: "SaaS 优选加速部署",
    description: "管理 Cloudflare for SaaS 的回退源、优选 CNAME 和自定义主机名。",
    badge: "SaaS",
    fields: ["回退源", "访问域名", "优选 CNAME", "自定义主机名"],
  },
  free: {
    title: "免费域名",
    description: "同步和管理免费域名服务商中的子域名资源。",
    badge: "DNSHE",
    fields: ["API Key", "API Secret", "子域名列表", "刷新数据"],
  },
  automation: {
    title: "自动优化设置",
    description: "按安全或速度方向批量覆盖 SSL、缓存、安全级别和页面规则。",
    badge: "Auto",
    fields: ["最优安全", "最优速度", "即时生效", "批量覆盖"],
  },
  history: {
    title: "操作历史",
    description: "查看 DNS、Workers、缓存和安全设置变更记录。",
    badge: "Log",
    fields: ["操作类型", "资源类型", "资源名称", "执行状态"],
  },
  workers: {
    title: "Workers",
    description: "创建 Worker 脚本，配置 workers.dev、路由、自定义域和环境变量。",
    badge: "Compute",
    fields: ["Worker 名称", "脚本代码", "路由", "环境变量"],
  },
  pages: {
    title: "Pages",
    description: "管理 Cloudflare Pages 项目、构建配置和部署状态。",
    badge: "Deploy",
    fields: ["项目列表", "部署记录", "构建设置", "自定义域"],
  },
  d1: {
    title: "D1 数据库",
    description: "创建 D1 SQL 数据库，并绑定到 Worker 环境变量。",
    badge: "SQL",
    fields: ["数据库名称", "数据库位置", "绑定名称", "查询管理"],
  },
  r2: {
    title: "R2 存储桶",
    description: "管理对象存储桶，并绑定到 Worker 运行时。",
    badge: "Object",
    fields: ["存储桶列表", "绑定名称", "访问策略", "对象管理"],
  },
  kv: {
    title: "Workers KV",
    description: "管理 KV 命名空间，并绑定到 Worker 运行时。",
    badge: "KV",
    fields: ["命名空间", "绑定名称", "键值数据", "刷新数据"],
  },
  templates: {
    title: "Worker 模板库",
    description: "保存常用 Worker 模板，快速创建反代、鉴权、缓存等脚本。",
    badge: "Code",
    fields: ["模板名称", "模板分类", "脚本内容", "一键创建"],
  },
  tunnels: {
    title: "Cloudflare Tunnels",
    description: "创建 Tunnel，管理连接器状态和公网入口规则。",
    badge: "Tunnel",
    fields: ["Tunnel 名称", "连接器", "公网主机名", "访问服务"],
  },
  needs: {
    title: "需求开发",
    description: "提交功能需求、Bug 报告或建议，跟踪处理状态。",
    badge: "Feedback",
    fields: ["反馈类型", "标题", "详细描述", "联系方式"],
  },
};

export const zoneNavItems = [
  ["dns", "database", "DNS 记录"],
  ["ssl", "shield", "SSL/TLS"],
  ["cache", "archive", "缓存管理"],
  ["firewall", "shield", "防火墙"],
  ["analytics", "grid", "统计分析"],
  ["rules", "settings", "页面规则"],
  ["certificates", "key", "证书管理"],
];

export const zoneSectionTitles = {
  dns: "DNS 记录管理",
  ssl: "SSL/TLS 管理",
  cache: "缓存管理",
  firewall: "防火墙规则",
  analytics: "统计分析",
  rules: "页面规则",
  certificates: "证书管理",
};

export const dnsTypes = ["A", "AAAA", "CNAME", "TXT", "MX", "NS"];
export const proxiableTypes = new Set(["A", "AAAA", "CNAME"]);

export const ttlOptions = [
  ["1", "自动"],
  ["60", "1 分钟"],
  ["120", "2 分钟"],
  ["300", "5 分钟"],
  ["600", "10 分钟"],
  ["1800", "30 分钟"],
  ["3600", "1 小时"],
  ["86400", "1 天"],
];

export const cacheLevelOptions = [
  {
    value: "basic",
    label: "无查询字符串",
    description: "仅缓存没有查询字符串的静态资源请求。",
  },
  {
    value: "simplified",
    label: "忽略查询字符串",
    description: "忽略 URL 查询参数，尽量复用同一份边缘缓存。",
  },
  {
    value: "aggressive",
    label: "标准",
    description: "按照完整 URL 缓存资源，适合大多数站点。",
  },
];

export const browserCacheTtlOptions = [
  ["0", "尊重现有标头"],
  ["1800", "30 分钟"],
  ["3600", "1 小时"],
  ["7200", "2 小时"],
  ["14400", "4 小时"],
  ["28800", "8 小时"],
  ["43200", "12 小时"],
  ["86400", "1 天"],
  ["604800", "1 周"],
  ["2678400", "1 个月"],
];

export const firewallRuleTypes = [
  {
    value: "ip",
    label: "IP 地址",
    targetLabel: "IP 地址",
    placeholder: "192.168.1.1",
  },
  {
    value: "country",
    label: "国家/地区",
    targetLabel: "国家/地区代码",
    placeholder: "CN",
  },
  {
    value: "asn",
    label: "ASN",
    targetLabel: "ASN",
    placeholder: "13335",
  },
  {
    value: "custom",
    label: "自定义表达式",
    targetLabel: "表达式",
    placeholder: '(http.host eq "example.com")',
  },
];

export const firewallActions = [
  ["block", "阻止"],
  ["allow", "允许"],
  ["challenge", "质询"],
  ["managed_challenge", "托管质询"],
  ["js_challenge", "JS 质询"],
  ["log", "仅记录"],
];

export const statusText = {
  active: "已激活",
  pending: "待激活",
  initializing: "初始化",
  moved: "已迁移",
  deleted: "已删除",
  deactivated: "已停用",
};

export const recordTypeHints = {
  A: {
    name: "@ 或 www",
    content: "例如: 192.0.2.1",
    help: "填写 IPv4 地址，代理开关可用于网站流量。",
  },
  AAAA: {
    name: "@ 或 www",
    content: "例如: 2001:db8::1",
    help: "填写 IPv6 地址，代理开关可用于网站流量。",
  },
  CNAME: {
    name: "例如: www",
    content: "例如: example.com",
    help: "指向另一个主机名，根域 CNAME 规则以 Cloudflare 返回为准。",
  },
  TXT: {
    name: "@ 或 _verify",
    content: "文本内容",
    help: "常用于站点验证、SPF、DKIM 等文本记录。",
  },
  MX: {
    name: "@",
    content: "例如: mail.example.com",
    help: "邮件交换记录需要优先级，默认值为 10。",
  },
  NS: {
    name: "例如: sub",
    content: "例如: ns1.example.com",
    help: "用于子域委派，通常不需要代理。",
  },
};

export const defaultDnsForm = {
  id: "",
  type: "A",
  name: "",
  content: "",
  ttl: "1",
  priority: "",
  proxied: false,
  comment: "",
};

export const defaultFirewallForm = {
  type: "ip",
  action: "block",
  target: "",
  description: "",
};

export const pageRuleCacheLevels = [
  ["", "不设置"],
  ["bypass", "绕过"],
  ["basic", "无查询字符串"],
  ["simplified", "忽略查询字符串"],
  ["aggressive", "标准"],
  ["cache_everything", "全部缓存"],
];

export const pageRuleBrowserCacheTtls = [
  ["", "不设置"],
  ["3600", "1小时"],
  ["14400", "4小时"],
  ["86400", "1天"],
  ["604800", "1周"],
];

export const pageRuleSecurityLevels = [
  ["", "不设置"],
  ["off", "关闭"],
  ["low", "低"],
  ["medium", "中"],
  ["high", "高"],
];

export const pageRuleSslModes = [
  ["", "不设置"],
  ["off", "关闭"],
  ["flexible", "灵活"],
  ["full", "完全"],
  ["strict", "严格"],
];

export const pageRuleToggleOptions = [
  ["", "不设置"],
  ["on", "开启"],
  ["off", "关闭"],
];

export const pageRuleForwardingTypes = [
  ["", "不设置"],
  ["301", "301 永久"],
  ["302", "302 临时"],
];

export const defaultPageRuleForm = {
  urlPattern: "",
  cacheLevel: "",
  browserCacheTtl: "",
  securityLevel: "",
  ssl: "",
  alwaysUseHttps: "",
  forwardingType: "",
  forwardingUrl: "",
  status: "active",
};

export const speedOptimizedDomains = [
  { value: "saas.sin.fan", label: "saas.sin.fan 推荐" },
  { value: "cdn.cnno.de", label: "cdn.cnno.de" },
  { value: "cdn.ddeed.de", label: "cdn.ddeed.de" },
];

export const defaultSpeedForm = {
  accessDomain: "",
  targetDomain: "",
  cacheTtl: "0",
  optimizedDomain: speedOptimizedDomains[0].value,
  optimizedDomainCustom: "",
};
