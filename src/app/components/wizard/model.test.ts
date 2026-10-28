import { describe, expect, it } from "vitest";

import {
  countWords,
  emptyEducation,
  emptyExperience,
  emptyWizardData,
  fromCVData,
  fullPhone,
  location,
  period,
  toCVData,
  toSnapshot,
  validateStep,
  WizardData,
} from "./model";

const filled = (): WizardData => ({
  ...emptyWizardData(),
  name: "Ana María Pérez",
  email: "ana@correo.com",
  phone: "300 123 4567",
  city: "Bogotá D.C.",
  summary: "Tecnóloga en desarrollo de software",
  education: [{ ...emptyEducation(), degree: "Tecnología", institution: "ETITC", start: "2023-02", current: true }],
  experience: [{ ...emptyExperience(), position: "Dev", company: "Acme", start: "2024-01", end: "2025-06" }],
  skills: [
    { key: "a", id: 1, label: "Python", escoUri: "http://data.europa.eu/esco/skill/x", preferredLabel: "Python", source: "esco_suggestion" },
    { key: "b", id: 2, label: "Liderazgo", escoUri: null, preferredLabel: null, source: "manual" },
  ],
});

describe("period", () => {
  it.each([
    ["2023-02", "2026-06", false, "2023-02 – 2026-06"],
    ["2023-02", "", true, "2023-02 – actual"],
    ["2023-02", "2026-06", true, "2023-02 – actual"],
    ["2023-02", "", false, "2023-02"],
    ["", "2026-06", false, ""],
  ])("%s / %s / en curso=%s", (start, end, current, expected) => {
    expect(period(start, end, current)).toBe(expected);
  });
});

describe("contacto y ubicación", () => {
  it("el teléfono lleva el indicativo y solo dígitos", () => {
    expect(fullPhone({ ...filled(), phoneDial: "57", phone: "300 123-4567" })).toBe("+57 3001234567");
    expect(fullPhone({ ...filled(), phone: "" })).toBe("");
  });

  it("la ubicación omite partes vacías", () => {
    expect(location(filled())).toBe("Bogotá D.C., Colombia");
    expect(location({ ...filled(), city: "", country: "" })).toBe("");
  });

  it("cuenta palabras ignorando espacios repetidos", () => {
    expect(countWords("  hola   mundo \n otra ")).toBe(3);
    expect(countWords("")).toBe(0);
  });
});

describe("toCVData y toSnapshot", () => {
  it("convierte el asistente al CV que se renderiza", () => {
    const cv = toCVData(filled());
    expect(cv.personalInfo.phone).toBe("+57 3001234567");
    expect(cv.education[0].year).toBe("2023-02 – actual");
    expect(cv.experience[0].duration).toBe("2024-01 – 2025-06");
    expect(cv.skills).toEqual(["Python", "Liderazgo"]);
  });

  it("el snapshot para el ATS usa los mismos periodos", () => {
    const snapshot = toSnapshot(filled());
    expect(snapshot.education[0].period).toBe("2023-02 – actual");
    expect(snapshot.experience[0].period).toBe("2024-01 – 2025-06");
    expect(snapshot.skills).toEqual(["Python", "Liderazgo"]);
  });
});

describe("fromCVData (datos del PDF con OCR)", () => {
  it("lee fechas, 'presente' y quita el 57 del teléfono colombiano", () => {
    const data = fromCVData(
      {
        personalInfo: { name: "Ana", email: "a@b.co", phone: "+57 300 123 4567", location: "Cali, Colombia", summary: "" },
        experience: [{ position: "Dev", company: "Acme", duration: "2021-03 - present", description: "x" }],
        education: [{ degree: "Ing.", institution: "UNAL", year: "2015-01 - 2020-12" }],
        skills: [],
      },
      emptyWizardData(),
    );
    expect(data.phone).toBe("3001234567");
    expect(data.city).toBe("Cali");
    expect(data.country).toBe("Colombia");
    expect(data.experience[0]).toMatchObject({ start: "2021-03", end: "", current: true });
    expect(data.education[0]).toMatchObject({ start: "2015-01", end: "2020-12", current: false });
  });

  it("si el PDF no trae algo, conserva lo que ya había", () => {
    const base = filled();
    const data = fromCVData({ personalInfo: { name: "", email: "", phone: "", location: "", summary: "" }, experience: [], education: [], skills: [] }, base);
    expect(data.name).toBe(base.name);
    expect(data.experience).toBe(base.experience);
  });
});

describe("validateStep", () => {
  it("el nombre es obligatorio", () => {
    expect(validateStep("personal", { ...filled(), name: "  " })).toEqual([
      { fieldId: "f-name", message: "Escribe tu nombre completo." },
    ]);
  });

  it.each(["ana@correo", "ana correo.com", "@correo.com"])("rechaza el correo %s", (email) => {
    expect(validateStep("personal", { ...filled(), email }).map((e) => e.fieldId)).toEqual(["f-email"]);
  });

  it("el correo y el teléfono son opcionales", () => {
    expect(validateStep("personal", { ...filled(), email: "", phone: "" })).toEqual([]);
  });

  it.each([
    ["123456", false],
    ["1234567", true],
    ["123456789012345", true],
    ["1234567890123456", false],
  ])("teléfono %s válido=%s", (phone, valid) => {
    expect(validateStep("personal", { ...filled(), phone }).length === 0).toBe(valid);
  });

  it("formación y experiencia piden sus campos obligatorios", () => {
    const data = filled();
    data.education = [{ ...emptyEducation(), key: "e1" }];
    data.experience = [{ ...emptyExperience(), key: "x1", position: "Dev" }];
    expect(validateStep("education", data).map((e) => e.fieldId)).toEqual(["f-edu-e1-degree", "f-edu-e1-institution"]);
    expect(validateStep("experience", data).map((e) => e.fieldId)).toEqual(["f-exp-x1-company"]);
  });

  it("la fecha de fin no puede ser anterior al inicio, salvo si está en curso", () => {
    const data = filled();
    data.experience = [{ ...emptyExperience(), key: "x1", position: "Dev", company: "Acme", start: "2025-01", end: "2024-01" }];
    expect(validateStep("experience", data).map((e) => e.fieldId)).toEqual(["f-exp-x1-end"]);
    data.experience[0].current = true;
    expect(validateStep("experience", data)).toEqual([]);
  });

  it("habilidades y exportar no bloquean el avance", () => {
    expect(validateStep("skills", emptyWizardData())).toEqual([]);
    expect(validateStep("export", emptyWizardData())).toEqual([]);
  });
});
