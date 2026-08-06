import { buildApp } from "./app.js";
import { connectMessaging } from "@taskflow/shared";

const app = buildApp();
const port = Number(process.env.PORT) || 3001;

async function start() {
  await connectMessaging();
  app.listen({ port, host: "0.0.0.0" }, (err) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
  });
}

start();
