export class OperationHistoryController {
  constructor({ operationHistoryService }) {
    this.operationHistoryService = operationHistoryService;
  }

  list = async ({ url }) => {
    const history = this.operationHistoryService.list({
      limit: url.searchParams.get("limit"),
      module: url.searchParams.get("module"),
      status: url.searchParams.get("status"),
    });

    return { statusCode: 200, body: { history } };
  };

  clear = async () => {
    return {
      statusCode: 200,
      body: { history: this.operationHistoryService.clear() },
    };
  };
}
