import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";

const app = new Hono()
  .get("/", (c) => c.json("list welcome"))
  .get("/:id", (c) => c.json(`get welcome ${c.req.param("id")}`))
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
      const body = await c.req.formData();
      return c.json(
        {
          ok: true,
          message: `Welcome! ${body.get("firstName")} ${body.get("lastName")}`,
        },
        201
      );
    }
  );

export default app;
