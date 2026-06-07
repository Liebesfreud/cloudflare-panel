import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

import { createContainer } from "./bootstrap.js";
import { createConfig } from "./config/env.js";

export function startServer({ config = createConfig(), logger = console } = {}) {
  const { app, panelAuthService, setupGuardService } = createContainer(config);
  const server = createServer(app);

  server.listen(config.server.port, () => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : config.server.port;

    logger.log(`Cloudflare preferred panel listening on http://127.0.0.1:${port}`);
    if (panelAuthService.getSetupState().setupRequired) {
      const wroteTokenFile = setupGuardService.persistForInitialSetup();
      const tokenSource = wroteTokenFile
        ? `read it inside the container from ${setupGuardService.tokenPath}`
        : "use the SETUP_TOKEN value configured for this container";

      logger.log(`Initial setup token is required before first setup: ${setupGuardService.mask()}`);
      logger.log(`Initial setup token is not printed in full; ${tokenSource}.`);
    }
  });

  return server;
}

export function isMainModule(moduleUrl, entryPath = process.argv[1]) {
  return Boolean(entryPath && moduleUrl === pathToFileURL(entryPath).href);
}

if (isMainModule(import.meta.url)) {
  startServer({ config: createConfig() });
}
