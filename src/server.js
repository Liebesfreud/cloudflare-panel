import { createServer } from "node:http";

import { createContainer } from "./bootstrap.js";
import { createConfig, loadLocalEnv } from "./config/env.js";

export function startServer({ config = createConfig(), logger = console } = {}) {
  const { app } = createContainer(config);
  const server = createServer(app);

  server.listen(config.server.port, () => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : config.server.port;

    logger.log(`Cloudflare preferred panel listening on http://127.0.0.1:${port}`);
  });

  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  loadLocalEnv();
  startServer({ config: createConfig() });
}
