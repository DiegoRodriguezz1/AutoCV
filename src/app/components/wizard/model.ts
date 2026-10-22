import type { CVData } from "../../dto/cv-data";
import type { CvSnapshot, ExperimentGroup, SkillSource } from "../../dto/experiment";
import { countryName } from "../../services/countries";

export interface EducationEntry {
  key: string;
  degree: string;
  degreeUri?: string;
  institution: string;
  start: string; // YYYY-MM
  end: string;
  current: boolean;
}

export interface ExperienceEntry {
  key: string;
  position: string;
  positionUri?: string;
  company: string;
  start: string;
  end: string;
  current: boolean;
  description: string;
}

export interface SkillEntry {
  key: string;
  id: number | null; // id en el servidor (null si no se pudo guardar)
  label: string;
  escoUri: string | null;
  preferredLabel: string | null;
  source: SkillSource;
}

export interface WizardData {
  name: string;
  email: string;
  phoneDial: string;
  phone: string;
  countryCode: string;
  country: string;
  city: string;
  summary: string;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  skills: SkillEntry[];
}

export const STEPS = [
  { id: "personal", label: "Datos", title: "Datos personales y perfil" },
  { id: "education", label: "Formación", title: "Formación" },
  { id: "experience", label: "Experiencia", title: "Experiencia" },
  { id: "skills", label: "Habilidades", title: "Habilidades" },
  { id: "export", label: "Exportar", title: "Revisar y exportar" },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

export const newKey = () => Math.random().toString(36).slice(2, 10);

export function emptyWizardData(): WizardData {
  return {
    name: "",
    email: "",
    phoneDial: "57",
    phone: "",
    countryCode: "CO",
    country: countryName("CO"),
    city: "",
    summary: "",
    education: [],
    experience: [],
    skills: [],
  };
}

export const emptyEducation = (): EducationEntry => ({
  key: newKey(), degree: "", institution: "", start: "", end: "", current: false,
});

export const emptyExperience = (): ExperienceEntry => ({
  key: newKey(), position: "", company: "", start: "", end: "", current: false, description: "",
});

export const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** "2023-02 – 2026-06", "2023-02 – actual" o "" si no hay inicio. */
export function period(start: string, end: string, current: boolean): string {
  if (!start) return "";
  if (current) return `${start} – actual`;
  return end ? `${start} – ${end}` : start;
}

export function location(data: WizardData): string {
  return [data.city, data.country].filter((part) => part.trim()).join(", ");
}

export function fullPhone(data: WizardData): string {
  const digits = data.phone.replace(/\D/g, "");
  return digits ? `+${data.phoneDial} ${digits}` : "";
}

export function toCVData(data: WizardData): CVData {
  return {
    personalInfo: {
      name: data.name,
      email: data.email,
      phone: fullPhone(data),
      location: location(data),
      summary: data.summary,
    },
    education: data.education.map((item) => ({
      degree: item.degree,
      institution: item.institution,
      // dto/cv-api.ts lee YYYY-MM del texto; "actual" se toma como "present".
      year: period(item.start, item.end, item.current),
    })),
    experience: data.experience.map((item) => ({
      position: item.position,
      company: item.company,
      duration: period(item.start, item.end, item.current),
      description: item.description,
    })),
    skills: data.skills.map((skill) => skill.label),
  };
}

export function toSnapshot(data: WizardData): CvSnapshot {
  return {
    name: data.name,
    email: data.email,
    phone: fullPhone(data),
    summary: data.summary,
    education: data.education.map((item) => ({
      degree: item.degree,
      institution: item.institution,
      period: period(item.start, item.end, item.current),
    })),
    experience: data.experience.map((item) => ({
      position: item.position,
      company: item.company,
      period: period(item.start, item.end, item.current),
    })),
    skills: data.skills.map((skill) => skill.label),
  };
}

const MONTH = /(\d{4})-(\d{2})/g;

/** Convierte los datos extraídos del PDF (OCR) al modelo del asistente. */
export function fromCVData(cv: CVData, base: WizardData): WizardData {
  const months = (text: string) => [...text.matchAll(MONTH)].map((match) => match[0]);
  const isCurrent = (text: string) => /present|actual/i.test(text);
  const [city = "", ...rest] = cv.personalInfo.location.split(",").map((part) => part.trim());
  return {
    ...base,
    name: cv.personalInfo.name || base.name,
    email: cv.personalInfo.email || base.email,
    phone: cv.personalInfo.phone.replace(/\D/g, "").replace(/^57(?=\d{10}$)/, "") || base.phone,
    city: city || base.city,
    country: rest.join(", ") || base.country,
    summary: cv.personalInfo.summary || base.summary,
    education: cv.education.length
      ? cv.education.map((item) => {
          const [start = "", end = ""] = months(item.year);
          return { ...emptyEducation(), degree: item.degree, institution: item.institution, start, end, current: isCurrent(item.year) };
        })
      : base.education,
    experience: cv.experience.length
      ? cv.experience.map((item) => {
          const [start = "", end = ""] = months(item.duration);
          return {
            ...emptyExperience(),
            position: item.position,
            company: item.company,
            description: item.description,
            start,
            end,
            current: isCurrent(item.duration),
          };
        })
      : base.experience,
  };
}

// ---------- Validación por paso ----------

export interface FieldError {
  fieldId: string;
  message: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateStep(step: StepId, data: WizardData): FieldError[] {
  const errors: FieldError[] = [];
  if (step === "personal") {
    if (!data.name.trim()) errors.push({ fieldId: "f-name", message: "Escribe tu nombre completo." });
    if (data.email.trim() && !EMAIL.test(data.email.trim())) {
      errors.push({ fieldId: "f-email", message: "El correo no tiene un formato válido. Ejemplo: nombre@correo.com" });
    }
    const digits = data.phone.replace(/\D/g, "").length;
    if (data.phone.trim() && (digits < 7 || digits > 15)) {
      errors.push({ fieldId: "f-phone", message: `El teléfono debe tener entre 7 y 15 números. Ahora tiene ${digits}.` });
    }
  }
  if (step === "education") {
    data.education.forEach((item, index) => {
      const n = index + 1;
      if (!item.degree.trim()) errors.push({ fieldId: `f-edu-${item.key}-degree`, message: `Formación ${n}: escribe el título.` });
      if (!item.institution.trim()) errors.push({ fieldId: `f-edu-${item.key}-institution`, message: `Formación ${n}: escribe la institución.` });
      if (item.start && !item.current && item.end && item.end < item.start) {
        errors.push({ fieldId: `f-edu-${item.key}-end`, message: `Formación ${n}: la fecha de fin es anterior a la de inicio.` });
      }
    });
  }
  if (step === "experience") {
    data.experience.forEach((item, index) => {
      const n = index + 1;
      if (!item.position.trim()) errors.push({ fieldId: `f-exp-${item.key}-position`, message: `Experiencia ${n}: escribe el cargo.` });
      if (!item.company.trim()) errors.push({ fieldId: `f-exp-${item.key}-company`, message: `Experiencia ${n}: escribe la empresa.` });
      if (item.start && !item.current && item.end && item.end < item.start) {
        errors.push({ fieldId: `f-exp-${item.key}-end`, message: `Experiencia ${n}: la fecha de fin es anterior a la de inicio.` });
      }
    });
  }
  return errors;
}

export const groupLabel = (group: ExperimentGroup) => (group === "A" ? "Grupo A · control" : "Grupo B · AutoCV");
