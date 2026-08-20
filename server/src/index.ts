import { loadEnv } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import { createApp } from "./app.js";

async function main() {
  const env = loadEnv();
  await connectDatabase(env);
  const app = createApp(env);
  app.listen(env.PORT, "0.0.0.0", () => {
    console.info(`Aegis API listening on ${env.SERVER_URL}`);
  });
}

main().catch((error: unknown) => {
  console.error("Failed to start server");
  console.error(error instanceof Error ? error.message : "Unknown error");
  process.exit(1);
});
