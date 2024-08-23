import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

const app = new Hono()
  .get("/", (c) => c.json("list hello world"))
  .get("/:id", (c) => c.json(`get hello world ${c.req.param("id")}`))
  .post(
    "/",
    zValidator(
      "form",
      z.object({
        firstName: z.string(),
        lastName: z.string(),
      })
    ),
    async (c) => {
      // ...
      const body = await c.req.valid("form");
      return c.json(
        {
          ok: true,
          message: `Hello World! ${body.firstName} ${body.lastName}`,
        },
        201
      );
    }
  )
  .post(
    "/new",
    zValidator(
      "json",
      z.object({
        firstName: z.string(),
        lastName: z.string(),
      })
    ),
    async (c) => {
      // ...
      const body = await c.req.valid("json");
      return c.json(
        {
          ok: true,
          message: `Created - Hello World! ${body["firstName"]} ${body["lastName"]}`,
        },
        201
      );
    }
  )
  .post("/upload", async (c) => {
    const body = await c.req.parseBody();
    console.log(body["file"]); // File | string

    if (body["file"] === undefined) {
      return c.json({ ok: false, message: "No file uploaded" }, 400);
    } else {
      const f = body["file"] as File;
      return c.json({ ok: true, message: `File uploaded ${f.name}` }, 201);
    }
  });

export default app;
