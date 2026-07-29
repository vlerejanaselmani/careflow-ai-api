import type { Context } from "hono";

import { parseJsonBody, requireUuidParam } from "../../../shared/request";
import type { SummaryService } from "../../ai/services/summary.service";
import { createIntakeSchema } from "../schemas/intake.schema";
import type { IntakeService } from "../services/intake.service";

export class IntakeController {
  constructor(
    private readonly intakeService: IntakeService,
    private readonly summaryService: SummaryService,
  ) {}

  async create(c: Context): Promise<Response> {
    const input = await parseJsonBody(c, createIntakeSchema);
    const intake = await this.intakeService.create(input);

    return c.json({ data: intake }, 201);
  }

  async list(c: Context): Promise<Response> {
    const intakes = await this.intakeService.findAll();

    return c.json({ data: intakes });
  }

  async getById(c: Context): Promise<Response> {
    const intake = await this.intakeService.findById(requireUuidParam(c, "id"));

    return c.json({ data: intake });
  }

  async summarize(c: Context): Promise<Response> {
    const intake = await this.intakeService.findById(requireUuidParam(c, "id"));
    const summary = await this.summaryService.summarize(intake);

    return c.json({ data: summary });
  }
}
