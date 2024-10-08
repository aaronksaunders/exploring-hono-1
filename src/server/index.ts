import { serve } from "@hono/node-server";
import { Hono } from "hono";
import welcome from "./welcome";
import helloWorld from "./helloWorld";
import auth from "./auth";

const app = new Hono();

const port = 3001;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

const routes = app
  .route("/welcome", welcome)
  .route("/hello-world", helloWorld)
  .route("/auth", auth);

export default app;
export type AppType = typeof routes;
