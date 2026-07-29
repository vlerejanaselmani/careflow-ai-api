import type { Context } from "hono";
import type { ZodSchema } from "zod";
import { z } from "zod";

import { AppError } from "./errors";

const uuidSchema = z.string().uuid();

export async function parseJsonBody<T>(
  c: Context,
  schema: ZodSchema<T>,
): Promise<T> {
  let body: unknown;

  try {
    body = await c.req.json();
  } catch {
    throw new AppError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "Request validation failed.",
      parsed.error.flatten(),
    );
  }

  return parsed.data;
}

export function requireParam(c: Context, name: string): string {
  const value = c.req.param(name);

  if (!value) {
    throw new AppError(
      400,
      "MISSING_ROUTE_PARAM",
      `Route parameter '${name}' is required.`,
    );
  }

  return value;
}

export function requireUuidParam(c: Context, name: string): string {
  const value = requireParam(c, name);
  const parsed = uuidSchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError(
      400,
      "INVALID_ROUTE_PARAM",
      `Route parameter '${name}' must be a valid UUID.`,
    );
  }

  return parsed.data;
}
