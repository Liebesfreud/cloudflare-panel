export function normalizeDnsRecord(record) {
  return {
    id: record.id,
    type: record.type,
    name: record.name,
    content: record.content,
    ttl: record.ttl,
    priority: record.priority ?? null,
    proxied: Boolean(record.proxied),
    proxiable: Boolean(record.proxiable),
    comment: record.comment ?? "",
    tags: Array.isArray(record.tags) ? record.tags : [],
    createdOn: record.created_on,
    modifiedOn: record.modified_on,
  };
}
