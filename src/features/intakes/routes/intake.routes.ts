import { Hono } from "hono";

import type { IntakeController } from "../controllers/intake.controller";

export function createIntakeRoutes(controller: IntakeController): Hono {
  const router = new Hono();

  router.post("/", (c) => controller.create(c));
  router.get("/", (c) => controller.list(c));
  router.get("/:id", (c) => controller.getById(c));
  router.post("/:id/summarize", (c) => controller.summarize(c));

  return router;
}
