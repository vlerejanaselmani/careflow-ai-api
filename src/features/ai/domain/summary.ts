export type SummaryUrgency = "routine" | "soon" | "urgent";

export type IntakeSummary = {
  summary: string;
  keyConcerns: string[];
  suggestedFollowUpQuestions: string[];
  urgency: SummaryUrgency;
  disclaimer: string;
};

export const intakeSummaryDisclaimer =
  "This output is for administrative intake support only and is not a medical diagnosis, triage decision, or treatment recommendation.";
