export function normalizeCloudflareZone(zone) {
  return {
    id: zone.id,
    name: zone.name,
    status: zone.status,
    paused: Boolean(zone.paused),
    type: zone.type,
    developmentMode: zone.development_mode,
    plan: {
      id: zone.plan?.id ?? null,
      name: zone.plan?.name ?? "Unknown",
      legacyId: zone.plan?.legacy_id ?? null,
    },
    nameServers: Array.isArray(zone.name_servers) ? zone.name_servers : [],
    originalNameServers: Array.isArray(zone.original_name_servers)
      ? zone.original_name_servers
      : [],
    createdOn: zone.created_on,
    modifiedOn: zone.modified_on,
  };
}
