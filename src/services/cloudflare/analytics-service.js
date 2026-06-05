import { HttpError } from "../../lib/http-error.js";
import { assertCloudflareId } from "./cloudflare-id.js";

const defaultDays = 7;
const maxTrendDays = 30;
const maxRangeDays = 90;

const zoneAnalyticsQuery = `
  query ZoneAnalytics($zoneTag: string, $dateStart: Date, $dateEnd: Date) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        httpRequests1dGroups(
          limit: 31
          orderBy: [date_ASC]
          filter: { date_geq: $dateStart, date_leq: $dateEnd }
        ) {
          dimensions {
            date
          }
          sum {
            bytes
            cachedBytes
            cachedRequests
            encryptedBytes
            encryptedRequests
            pageViews
            requests
            threats
            responseStatusMap {
              edgeResponseStatus
              requests
            }
            countryMap {
              bytes
              clientCountryName
              requests
              threats
            }
            contentTypeMap {
              bytes
              edgeResponseContentTypeName
              requests
            }
          }
          uniq {
            uniques
          }
        }
      }
    }
  }
`;

const securityEventsQuery = `
  query ZoneSecurityEvents($zoneTag: string, $datetimeStart: Time, $datetimeEnd: Time) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        firewallEventsAdaptiveGroups(
          limit: 50
          orderBy: [count_DESC]
          filter: { datetime_geq: $datetimeStart, datetime_leq: $datetimeEnd }
        ) {
          count
          dimensions {
            action
            clientAsn
            clientCountryName
            clientIP
            description
            ruleId
            source
            userAgent
          }
        }
      }
    }
  }
`;

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function toPercent(part, total) {
  return total > 0 ? Number(((part / total) * 100).toFixed(2)) : 0;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function buildDateRange(days = defaultDays, now = new Date()) {
  const normalizedDays = Number.isInteger(days) && days > 0 ? Math.min(days, maxTrendDays) : defaultDays;
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = addDays(end, -(normalizedDays - 1));

  return {
    days: normalizedDays,
    startDate: isoDate(start),
    endDate: isoDate(end),
  };
}

function normalizeDateInput(value) {
  const text = String(value || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return "";
  }

  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? "" : isoDate(date);
}

function buildDateRangeFromOptions(options = {}, now = new Date()) {
  const explicitStart = normalizeDateInput(options.startDate);
  const explicitEnd = normalizeDateInput(options.endDate);

  if (!explicitStart || !explicitEnd) {
    return buildDateRange(Number(options.days), now);
  }

  const start = new Date(`${explicitStart}T00:00:00.000Z`);
  const end = new Date(`${explicitEnd}T00:00:00.000Z`);

  if (start > end) {
    throw new HttpError(400, "统计开始日期不能晚于结束日期");
  }

  const days = Math.floor((end - start) / 86_400_000) + 1;

  if (days > maxRangeDays) {
    throw new HttpError(400, `统计日期范围不能超过 ${maxRangeDays} 天`);
  }

  return {
    days,
    startDate: explicitStart,
    endDate: explicitEnd,
  };
}

function mergeMetricMap(map, key, input) {
  const id = String(input[key] ?? "unknown") || "unknown";
  const current = map.get(id) || {
    id,
    requests: 0,
    bytes: 0,
    threats: 0,
  };

  current.requests += toNumber(input.requests);
  current.bytes += toNumber(input.bytes);
  current.threats += toNumber(input.threats);
  map.set(id, current);
}

function sortTopItems(map, limit = 8) {
  return [...map.values()]
    .sort((left, right) => right.requests - left.requests || right.bytes - left.bytes)
    .slice(0, limit);
}

function emptyTotals() {
  return {
    requests: 0,
    cachedRequests: 0,
    bytes: 0,
    cachedBytes: 0,
    encryptedRequests: 0,
    encryptedBytes: 0,
    pageViews: 0,
    threats: 0,
    uniques: 0,
    cacheHitRate: 0,
    encryptedRate: 0,
  };
}

function normalizeGroup(group) {
  const sum = group?.sum || {};

  return {
    date: group?.dimensions?.date || "",
    requests: toNumber(sum.requests),
    cachedRequests: toNumber(sum.cachedRequests),
    bytes: toNumber(sum.bytes),
    cachedBytes: toNumber(sum.cachedBytes),
    encryptedRequests: toNumber(sum.encryptedRequests),
    encryptedBytes: toNumber(sum.encryptedBytes),
    pageViews: toNumber(sum.pageViews),
    threats: toNumber(sum.threats),
    uniques: toNumber(group?.uniq?.uniques),
    responseStatusMap: Array.isArray(sum.responseStatusMap) ? sum.responseStatusMap : [],
    countryMap: Array.isArray(sum.countryMap) ? sum.countryMap : [],
    contentTypeMap: Array.isArray(sum.contentTypeMap) ? sum.contentTypeMap : [],
  };
}

function normalizeAnalytics(groups, range) {
  const totals = emptyTotals();
  const countries = new Map();
  const statuses = new Map();
  const contentTypes = new Map();
  const groupsByDate = new Map(groups.map((group) => [group.date, group]));
  const trend = [];

  let cursor = new Date(`${range.startDate}T00:00:00.000Z`);
  const end = new Date(`${range.endDate}T00:00:00.000Z`);

  while (cursor <= end) {
    const date = isoDate(cursor);
    const group = groupsByDate.get(date) || normalizeGroup({ dimensions: { date } });

    totals.requests += group.requests;
    totals.cachedRequests += group.cachedRequests;
    totals.bytes += group.bytes;
    totals.cachedBytes += group.cachedBytes;
    totals.encryptedRequests += group.encryptedRequests;
    totals.encryptedBytes += group.encryptedBytes;
    totals.pageViews += group.pageViews;
    totals.threats += group.threats;
    totals.uniques += group.uniques;

    for (const item of group.countryMap) {
      mergeMetricMap(countries, "clientCountryName", item);
    }

    for (const item of group.responseStatusMap) {
      mergeMetricMap(statuses, "edgeResponseStatus", item);
    }

    for (const item of group.contentTypeMap) {
      mergeMetricMap(contentTypes, "edgeResponseContentTypeName", item);
    }

    trend.push({
      date,
      requests: group.requests,
      cachedRequests: group.cachedRequests,
      bytes: group.bytes,
      threats: group.threats,
      uniques: group.uniques,
      cacheHitRate: toPercent(group.cachedRequests, group.requests),
    });

    cursor = addDays(cursor, 1);
  }

  totals.cacheHitRate = toPercent(totals.cachedRequests, totals.requests);
  totals.encryptedRate = toPercent(totals.encryptedRequests, totals.requests);

  return {
    range,
    totals,
    trend,
    topCountries: sortTopItems(countries),
    topStatuses: sortTopItems(statuses),
    topContentTypes: sortTopItems(contentTypes),
  };
}

function normalizeSecurityEventGroup(group = {}) {
  const dimensions = group.dimensions || {};

  return {
    action: dimensions.action || "unknown",
    asn: dimensions.clientAsn || "",
    country: dimensions.clientCountryName || "",
    ip: dimensions.clientIP || "",
    description: dimensions.description || "",
    ruleId: dimensions.ruleId || "",
    source: dimensions.source || "",
    userAgent: dimensions.userAgent || "",
    count: toNumber(group.count),
  };
}

function pickZone(data) {
  const zones = data?.viewer?.zones;

  if (!Array.isArray(zones)) {
    throw new HttpError(502, "Cloudflare 统计数据返回格式异常，请稍后重试。");
  }

  return zones[0] || null;
}

export class AnalyticsService {
  constructor({ cloudflareClient, now = () => new Date() }) {
    this.cloudflareClient = cloudflareClient;
    this.now = now;
  }

  async getZoneAnalytics(zoneId, options = {}) {
    assertCloudflareId(zoneId, "区域 ID");

    const range = buildDateRangeFromOptions(options, this.now());
    const warnings = [];
    const data = await this.cloudflareClient.graphql(zoneAnalyticsQuery, {
      zoneTag: zoneId,
      dateStart: range.startDate,
      dateEnd: range.endDate,
    });
    const zone = pickZone(data);

    if (!zone) {
      throw new HttpError(404, "未找到该域名的统计数据");
    }

    const groups = Array.isArray(zone.httpRequests1dGroups)
      ? zone.httpRequests1dGroups.map(normalizeGroup)
      : [];

    const analytics = normalizeAnalytics(groups, range);
    const datetimeStart = `${range.startDate}T00:00:00Z`;
    const datetimeEnd = `${range.endDate}T23:59:59Z`;

    try {
      const securityData = await this.cloudflareClient.graphql(securityEventsQuery, {
        zoneTag: zoneId,
        datetimeStart,
        datetimeEnd,
      });
      const securityZone = pickZone(securityData);
      const securityGroups = Array.isArray(securityZone?.firewallEventsAdaptiveGroups)
        ? securityZone.firewallEventsAdaptiveGroups
        : [];
      analytics.securityEvents = securityGroups.map(normalizeSecurityEventGroup);
    } catch (error) {
      analytics.securityEvents = [];
      warnings.push(`安全事件读取失败：${error.message}`);
    }

    analytics.warnings = warnings;
    return analytics;
  }
}
