const app = require("./app");
const { env } = require("./config/env");
const { connectDb } = require("./config/db");

async function bootstrap() {
  await connectDb();
  app.listen(env.port, () => {
    console.log(`Backend running on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start backend:", error.message);
  process.exit(1);
});
