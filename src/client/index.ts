import { AppType } from "../server/index";
import { hc } from "hono/client";

(async () => {
  const client = hc<AppType>("http://localhost:3001/");

  const resp1 = await client.welcome.$get();
  if (resp1.ok) {
    console.log(await resp1.json());
  }

  const resp2 = await client.welcome[":id"].$get({
    param: { id: "123" },
  });
  if (resp2.ok) {
    console.log(await resp2.json());
  }

  const resp3 = await client["hello-world"][":id"].$get({
    param: { id: "123" },
  });
  if (resp3.ok) {
    console.log(await resp3.json());
  }

  const resp4 = await client["hello-world"].$post({
    form: {
      firstName: "John",
      lastName: "Doe",
    },
  });
  if (resp4.ok) {
    const j = await resp4.json();
    console.log("[message] ==>", j.message);
  }

  const resp5 = await client["hello-world"].new.$post({
    json: {
      firstName: "John",
      lastName: "Doe Created",
    },
  });
  if (resp5.ok) {
    const j = await resp5.json();
    console.log("[message - new] ==>", j.message);
  } else {
    console.log("Error", resp5.status);
  }
})();
