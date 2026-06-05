export class AnalyticsController {
  constructor({ analyticsService }) {
    this.analyticsService = analyticsService;
  }

  get = async ({ params, url }) => {
    const analytics = await this.analyticsService.getZoneAnalytics(params.zoneId, {
      days: Number(url.searchParams.get("days")),
      startDate: url.searchParams.get("startDate"),
      endDate: url.searchParams.get("endDate"),
    });

    return { statusCode: 200, body: { analytics } };
  };
}
