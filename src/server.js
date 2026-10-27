import { app } from "./app.js";
import { config } from "./config.js";
import { closeDatabase, connectDatabase } from "./db.js";

await connectDatabase();
const server = app.listen(config.port, () => {
  console.log(`Library Management System running at http://localhost:${config.port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received. Closing services...`);
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
