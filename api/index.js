import { createContainer } from "../src/bootstrap.js";
import { createConfig, loadLocalEnv } from "../src/config/env.js";

loadLocalEnv();

const { app } = createContainer(createConfig());

export default function handler(request, response) {
  app(request, response);
}
