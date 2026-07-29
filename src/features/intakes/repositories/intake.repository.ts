import type { Intake, IntakeInput } from "../domain/intake";

export interface IntakeRepository {
  create(input: IntakeInput): Promise<Intake>;
  findAll(): Promise<Intake[]>;
  findById(id: string): Promise<Intake | null>;
}

export class InMemoryIntakeRepository implements IntakeRepository {
  private readonly intakes = new Map<string, Intake>();

  async create(input: IntakeInput): Promise<Intake> {
    const now = new Date().toISOString();
    const intake: Intake = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };

    this.intakes.set(intake.id, intake);
    return intake;
  }

  async findAll(): Promise<Intake[]> {
    return Array.from(this.intakes.values()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
  }

  async findById(id: string): Promise<Intake | null> {
    return this.intakes.get(id) ?? null;
  }
}
