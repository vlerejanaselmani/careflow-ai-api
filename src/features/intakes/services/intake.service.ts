import { AppError } from "../../../shared/errors";
import type { Intake, IntakeInput } from "../domain/intake";
import type { IntakeRepository } from "../repositories/intake.repository";

export class IntakeService {
  constructor(private readonly repository: IntakeRepository) {}

  create(input: IntakeInput): Promise<Intake> {
    return this.repository.create(input);
  }

  findAll(): Promise<Intake[]> {
    return this.repository.findAll();
  }

  async findById(id: string): Promise<Intake> {
    const intake = await this.repository.findById(id);

    if (!intake) {
      throw new AppError(404, "INTAKE_NOT_FOUND", "Intake was not found.");
    }

    return intake;
  }
}
