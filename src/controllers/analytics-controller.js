export class AnalyticsController {
  constructor({ analyticsService }) {
    this.analyticsService = analyticsService;
  }

  get = async ({ params, url }) => {
    const analytics = await this.analyticsService.getZoneAnalytics(params.zoneId, {
      days: Number(url.searchParams.get("days")),
    });

    return { statusCode: 200, body: { analytics } };
  };
}
