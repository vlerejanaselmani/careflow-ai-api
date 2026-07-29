import { z } from "zod";

import { AppError } from "../../../shared/errors";
import type { Intake } from "../../intakes/domain/intake";
import {
  intakeSummaryDisclaimer,
  type IntakeSummary,
  type SummaryUrgency,
} from "../domain/summary";

export interface SummaryProvider {
  summarize(intake: Intake): Promise<IntakeSummary>;
}

export class MockSummaryProvider implements SummaryProvider {
  async summarize(intake: Intake): Promise<IntakeSummary> {
    const urgency = determineMockUrgency(intake);

    return {
      summary: `${intake.patientName}, age ${intake.age}, reported ${joinList(
        intake.symptoms,
      )} for ${intake.symptomDurationDays} day(s). Notes: ${
        intake.additionalNotes || "No additional notes provided."
      } This administrative summary is intended to help staff prepare intake context before clinical review.`,
      keyConcerns: buildMockConcerns(intake),
      suggestedFollowUpQuestions: [
        "When did each symptom first begin, and has the pattern changed?",
        "Are there any recent medication, allergy, exposure, or care-access changes to document?",
        "Are there any safety, mobility, transportation, language, or caregiver needs for follow-up?",
      ],
      urgency,
      disclaimer: intakeSummaryDisclaimer,
    };
  }
}

export class OpenRouterSummaryProvider implements SummaryProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async summarize(intake: Intake): Promise<IntakeSummary> {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/careflow-ai-api",
          "X-Title": "CareFlow AI API",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content:
                "You summarize patient intake information for administrative support only. Do not diagnose, triage, recommend treatment, or claim clinical certainty. Return only valid JSON.",
            },
            {
              role: "user",
              content: buildSummaryPrompt(intake),
            },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!response.ok) {
      throw new AppError(
        502,
        "AI_PROVIDER_ERROR",
        "OpenRouter failed to generate a summary.",
        { status: response.status },
      );
    }

    const payload = openRouterResponseSchema.safeParse(await response.json());

    if (!payload.success) {
      throw new AppError(
        502,
        "AI_PROVIDER_INVALID_RESPONSE",
        "OpenRouter returned an invalid summary response.",
      );
    }

    return parseSummaryContent(payload.data.choices[0].message.content);
  }
}

const aiSummarySchema = z.object({
  summary: z.string().min(1),
  keyConcerns: z.array(z.string().min(1)).min(1),
  suggestedFollowUpQuestions: z.array(z.string().min(1)).min(1),
  urgency: z.enum(["routine", "soon", "urgent"]),
  disclaimer: z.string().min(1),
});

const openRouterResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string(),
        }),
      }),
    )
    .min(1),
});

function determineMockUrgency(intake: Intake): SummaryUrgency {
  const symptomText = intake.symptoms.join(" ").toLowerCase();
  const urgentTerms = ["chest pain", "shortness of breath", "fainting"];

  if (urgentTerms.some((term) => symptomText.includes(term))) {
    return "urgent";
  }

  if (intake.symptomDurationDays >= 14 || intake.age >= 75) {
    return "soon";
  }

  return "routine";
}

function buildMockConcerns(intake: Intake): string[] {
  const concerns = [
    `Reported symptoms: ${joinList(intake.symptoms)}`,
    `Symptom duration: ${intake.symptomDurationDays} day(s)`,
  ];

  if (intake.medications.length > 0) {
    concerns.push(
      `Medication context to verify: ${joinList(intake.medications)}`,
    );
  }

  if (intake.allergies.length > 0) {
    concerns.push(`Allergies to confirm: ${joinList(intake.allergies)}`);
  }

  return concerns;
}

function joinList(values: string[]): string {
  return values.join(", ");
}

function buildSummaryPrompt(intake: Intake): string {
  return JSON.stringify({
    task: "Create an administrative patient-intake summary. Do not diagnose, triage, or recommend treatment.",
    outputShape: {
      summary: "string",
      keyConcerns: "string[]",
      suggestedFollowUpQuestions: "string[]",
      urgency: "routine | soon | urgent",
      disclaimer:
        "Must state the output is for administrative intake support and not diagnosis.",
    },
    intake,
  });
}

function parseSummaryContent(content: string): IntakeSummary {
  try {
    const parsed = aiSummarySchema.parse(JSON.parse(content));
    return {
      ...parsed,
      disclaimer: parsed.disclaimer.includes("not a medical diagnosis")
        ? parsed.disclaimer
        : intakeSummaryDisclaimer,
    };
  } catch {
    throw new AppError(
      502,
      "AI_PROVIDER_INVALID_RESPONSE",
      "OpenRouter returned summary content that could not be parsed.",
    );
  }
}
