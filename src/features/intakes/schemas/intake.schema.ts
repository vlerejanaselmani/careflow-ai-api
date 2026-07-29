import { z } from "zod";

export const createIntakeSchema = z.object({
  patientName: z.string().trim().min(1).max(120),
  age: z.number().int().min(0).max(125),
  symptoms: z.array(z.string().trim().min(1).max(160)).min(1).max(25),
  symptomDurationDays: z.number().int().min(0).max(3650),
  medications: z.array(z.string().trim().min(1).max(160)).max(50).default([]),
  allergies: z.array(z.string().trim().min(1).max(160)).max(50).default([]),
  additionalNotes: z.string().trim().max(2000).optional(),
});

export type CreateIntakeRequest = z.infer<typeof createIntakeSchema>;
