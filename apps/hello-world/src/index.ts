import Fastify from "fastify";

const app = Fastify();

app.get("/", async () => {
  return { status: "ok", message: "hello from taskflow" };
});

const port = Number(process.env.PORT) || 3000;
app.listen({ port, host: "0.0.0.0" }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
});
