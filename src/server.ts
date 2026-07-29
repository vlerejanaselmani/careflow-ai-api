import { serve } from "bun";

import { createApp } from "./app";
import { loadEnv } from "./config/env";

const env = loadEnv(Bun.env);
const app = createApp({ env });

serve({
  fetch: app.fetch,
  port: env.PORT,
});

console.info(`CareFlow AI API listening on http://localhost:${env.PORT}`);
