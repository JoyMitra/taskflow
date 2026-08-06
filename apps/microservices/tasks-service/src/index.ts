import { buildApp } from "./app.js";
import { connectMessaging } from "@taskflow/shared";
import { initSubscribers } from "./subscribers.js";

const app = buildApp();
const port = Number(process.env.PORT) || 3002;

async function start() {
  await connectMessaging();
  await initSubscribers();

  app.listen({ port, host: "0.0.0.0" }, (err) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
  });
}

start();
