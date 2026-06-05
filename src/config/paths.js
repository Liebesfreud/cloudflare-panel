import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const configDir = dirname(fileURLToPath(import.meta.url));

export const srcDir = dirname(configDir);
export const projectRoot = dirname(srcDir);
export const publicDir = join(projectRoot, "public");
