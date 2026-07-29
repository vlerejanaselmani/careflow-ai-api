import { describe, expect, test } from "bun:test";

import { createApp } from "../src/app";
import type { AppEnv } from "../src/config/env";

const testEnv: AppEnv = {
  PORT: 3000,
  OPENROUTER_API_KEY: undefined,
  OPENROUTER_MODEL: "anthropic/claude-3.5-haiku",
};

const validIntake = {
  patientName: "Jordan Lee",
  age: 42,
  symptoms: ["cough", "fatigue"],
  symptomDurationDays: 5,
  medications: ["lisinopril"],
  allergies: ["penicillin"],
  additionalNotes: "Symptoms worsen at night.",
};

async function createIntake(app: ReturnType<typeof createApp>) {
  const response = await app.request("/api/intakes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validIntake),
  });

  return response.json();
}

async function createIntakeData(app: ReturnType<typeof createApp>) {
  const body = await createIntake(app);
  return body.data as { id: string };
}

describe("CareFlow AI API", () => {
  test("returns health status", async () => {
    const app = createApp({ env: testEnv });
    const response = await app.request("/api/health");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.status).toBe("ok");
    expect(body.data.service).toBe("careflow-ai-api");
  });

  test("creates an intake with generated id and timestamps", async () => {
    const app = createApp({ env: testEnv });
    const response = await app.request("/api/intakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validIntake),
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(body.data.createdAt).toEqual(expect.any(String));
    expect(body.data.updatedAt).toEqual(expect.any(String));
  });

  test("rejects invalid intake bodies", async () => {
    const app = createApp({ env: testEnv });
    const response = await app.request("/api/intakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validIntake, symptoms: [] }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  test("rejects malformed JSON bodies", async () => {
    const app = createApp({ env: testEnv });
    const response = await app.request("/api/intakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"patientName":',
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_JSON");
  });

  test("lists created intakes", async () => {
    const app = createApp({ env: testEnv });
    await createIntake(app);

    const response = await app.request("/api/intakes");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].patientName).toBe(validIntake.patientName);
  });

  test("returns a created intake by id", async () => {
    const app = createApp({ env: testEnv });
    const created = await createIntakeData(app);

    const response = await app.request(`/api/intakes/${created.id}`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(created.id);
  });

  test("returns 404 for a missing intake", async () => {
    const app = createApp({ env: testEnv });
    const response = await app.request(
      "/api/intakes/00000000-0000-4000-8000-000000000000",
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("INTAKE_NOT_FOUND");
  });

  test("summarizes an intake with deterministic local provider", async () => {
    const app = createApp({ env: testEnv });
    const created = await createIntakeData(app);

    const response = await app.request(`/api/intakes/${created.id}/summarize`, {
      method: "POST",
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.summary).toContain("Jordan Lee");
    expect(body.data.keyConcerns.length).toBeGreaterThan(0);
    expect(body.data.suggestedFollowUpQuestions.length).toBeGreaterThan(0);
    expect(body.data.urgency).toBe("routine");
    expect(body.data.disclaimer).toContain("not a medical diagnosis");
  });

  test("returns 404 when summarizing a missing intake", async () => {
    const app = createApp({ env: testEnv });
    const response = await app.request(
      "/api/intakes/00000000-0000-4000-8000-000000000000/summarize",
      { method: "POST" },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("INTAKE_NOT_FOUND");
  });

  test("requires UUID route parameters", async () => {
    const app = createApp({ env: testEnv });
    const response = await app.request("/api/intakes/not-a-uuid");
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("INVALID_ROUTE_PARAM");
  });

  test("summary response always includes the medical safety disclaimer", async () => {
    const app = createApp({ env: testEnv });
    const created = await createIntakeData(app);

    const response = await app.request(`/api/intakes/${created.id}/summarize`, {
      method: "POST",
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.disclaimer).toBe(
      "This output is for administrative intake support only and is not a medical diagnosis, triage decision, or treatment recommendation.",
    );
  });

  test("returns urgent mock urgency for high concern symptom language", async () => {
    const app = createApp({ env: testEnv });
    const response = await app.request("/api/intakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validIntake,
        symptoms: ["shortness of breath"],
      }),
    });
    const created = await response.json();

    const summaryResponse = await app.request(
      `/api/intakes/${created.data.id}/summarize`,
      { method: "POST" },
    );
    const body = await summaryResponse.json();

    expect(body.data.urgency).toBe("urgent");
  });

  test("returns route not found for unknown endpoints", async () => {
    const app = createApp({ env: testEnv });
    const response = await app.request("/api/unknown");
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("ROUTE_NOT_FOUND");
  });
});
