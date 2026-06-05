export const firewallExpressionExamples = [
  {
    title: "安全防护",
    items: [
      {
        title: "阻止恶意扫描器",
        expression:
          '(http.user_agent contains "sqlmap") or (http.user_agent contains "nmap") or (http.user_agent contains "python-requests")',
        description: "阻止常见恶意扫描器",
        action: "block",
      },
      {
        title: "拦截非浏览器 UA（防脚本扫描）",
        expression: 'not http.user_agent lowercase matches "*mozilla*"',
        description: "拦截未带浏览器 UA 的攻击流量",
        action: "js_challenge",
        note: "动作：JS Challenge",
      },
      {
        title: "拦截 SQL 注入攻击",
        expression:
          '(http.request.uri contains "union select") or (http.request.uri contains "sleep(") or (http.request.uri contains " or 1=1")',
        description: "拦截明显的 SQL 注入特征",
        action: "block",
      },
      {
        title: "保护管理后台路径",
        expression:
          '(http.request.uri.path contains "/wp-admin") or (http.request.uri.path contains "/admin") or (http.request.uri.path contains "/phpmyadmin")',
        description: "保护管理后台",
        action: "block",
      },
      {
        title: "限制后台访问（固定 IP 白名单）",
        expression: 'http.request.uri.path contains "/admin" and not ip.src in {1.2.3.4}',
        description: "限制后台访问（仅允许固定 IP）",
        action: "block",
        warning: "请修改为您的实际 IP 地址",
      },
    ],
  },
  {
    title: "地理位置",
    items: [
      {
        title: "仅允许特定国家",
        expression: '(ip.geoip.country in {"CN" "US" "JP"})',
        description: "仅允许特定国家访问",
        action: "allow",
      },
      {
        title: "阻止中国以外访问",
        expression: 'not ip.geoip.country in {"CN"}',
        description: "阻止中国以外访问",
        action: "challenge",
        warning: "需开启 IP Geolocation",
      },
      {
        title: "阻止特定国家",
        expression: '(not ip.geoip.country in {"CN" "US"})',
        description: "阻止特定国家访问",
        action: "block",
      },
    ],
  },
  {
    title: "爬虫控制",
    items: [
      {
        title: "允许搜索引擎爬虫（优先级高）",
        expression: "cf.client.bot",
        description: "允许搜索引擎爬虫",
        action: "allow",
        note: "配合下一条规则使用，先允许搜索引擎",
      },
      {
        title: "非爬虫流量需验证（优先级低）",
        expression: "not cf.client.bot",
        description: "非爬虫流量需验证",
        action: "js_challenge",
        note: "与上一条规则配合，实现仅允许搜索引擎",
      },
      {
        title: "阻止爬虫",
        expression:
          '(http.user_agent contains "bot") or (http.user_agent contains "crawler") or (http.user_agent contains "spider")',
        description: "阻止爬虫访问",
        action: "block",
      },
    ],
  },
  {
    title: "API 保护",
    items: [
      {
        title: "保护登录接口",
        expression: '(http.request.uri.path eq "/api/login") and (http.request.method eq "POST")',
        description: "保护登录接口",
        action: "challenge",
      },
    ],
  },
  {
    title: "设备类型",
    items: [
      {
        title: "仅允许移动设备",
        expression:
          '(http.user_agent contains "Mobile") or (http.user_agent contains "Android") or (http.user_agent contains "iPhone")',
        description: "仅允许移动设备访问",
        action: "allow",
      },
    ],
  },
  {
    title: "Referer 控制",
    items: [
      {
        title: "防止盗链",
        expression: '(http.referer contains "example.com") or (http.referer eq "")',
        description: "防止盗链",
        action: "block",
      },
    ],
  },
];

export function findFirewallExample(exampleId) {
  const [groupIndex, itemIndex] = String(exampleId || "")
    .split(":")
    .map((value) => Number(value));

  if (!Number.isInteger(groupIndex) || !Number.isInteger(itemIndex)) {
    return null;
  }

  return firewallExpressionExamples[groupIndex]?.items[itemIndex] || null;
}
