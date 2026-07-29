import { Hono } from "hono";

import type { AppEnv } from "./config/env";
import { loadEnv } from "./config/env";
import {
  MockSummaryProvider,
  OpenRouterSummaryProvider,
  type SummaryProvider,
} from "./features/ai/providers/summary.provider";
import { SummaryService } from "./features/ai/services/summary.service";
import { IntakeController } from "./features/intakes/controllers/intake.controller";
import {
  InMemoryIntakeRepository,
  type IntakeRepository,
} from "./features/intakes/repositories/intake.repository";
import { createIntakeRoutes } from "./features/intakes/routes/intake.routes";
import { IntakeService } from "./features/intakes/services/intake.service";
import { toErrorResponse } from "./shared/errors";

export type AppDependencies = {
  env?: AppEnv;
  intakeRepository?: IntakeRepository;
  summaryProvider?: SummaryProvider;
};

export function createApp(dependencies: AppDependencies = {}): Hono {
  const env = dependencies.env ?? loadEnv(process.env);
  const intakeRepository =
    dependencies.intakeRepository ?? new InMemoryIntakeRepository();
  const summaryProvider =
    dependencies.summaryProvider ??
    (env.OPENROUTER_API_KEY
      ? new OpenRouterSummaryProvider(
          env.OPENROUTER_API_KEY,
          env.OPENROUTER_MODEL,
        )
      : new MockSummaryProvider());

  const intakeService = new IntakeService(intakeRepository);
  const summaryService = new SummaryService(summaryProvider);
  const intakeController = new IntakeController(intakeService, summaryService);

  const app = new Hono();

  app.onError((error, c) => {
    const { statusCode, body } = toErrorResponse(error);
    return c.json(body, statusCode);
  });

  app.notFound((c) =>
    c.json(
      {
        error: {
          code: "ROUTE_NOT_FOUND",
          message: "Route was not found.",
        },
      },
      404,
    ),
  );

  app.get("/api/health", (c) =>
    c.json({
      data: {
        status: "ok",
        service: "careflow-ai-api",
        timestamp: new Date().toISOString(),
      },
    }),
  );

  app.route("/api/intakes", createIntakeRoutes(intakeController));

  return app;
}
