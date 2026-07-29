export type IntakeInput = {
  patientName: string;
  age: number;
  symptoms: string[];
  symptomDurationDays: number;
  medications: string[];
  allergies: string[];
  additionalNotes?: string;
};

export type Intake = IntakeInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
