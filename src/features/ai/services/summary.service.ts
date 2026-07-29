import type { IntakeSummary } from "../domain/summary";
import type { SummaryProvider } from "../providers/summary.provider";
import type { Intake } from "../../intakes/domain/intake";

export class SummaryService {
  constructor(private readonly provider: SummaryProvider) {}

  summarize(intake: Intake): Promise<IntakeSummary> {
    return this.provider.summarize(intake);
  }
}
