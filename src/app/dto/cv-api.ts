import type { CVData } from "./cv-data";

export interface SocialNetworkDTO {
  network: string;
  username: string;
}

export interface EducationDTO {
  institution: string;
  area: string;
  /** RenderCV lo pinta en una columna angosta pensada para siglas (BSc, MSc); el título va en `area`. */
  degree?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  highlights?: string[];
}

export interface ExperienceDTO {
  company: string;
  position: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  summary?: string;
  highlights?: string[];
}

export interface SkillDTO {
  label: string;
  details: string;
}

export interface CvSectionsDTO {
  [key: string]: string[] | EducationDTO[] | ExperienceDTO[] | SkillDTO[] | unknown[];
}

export interface CvDTO {
  name: string;
  headline?: string;
  location?: string;
  email?: string | string[];
  phone?: string | string[];
  social_networks?: SocialNetworkDTO[];
  sections: CvSectionsDTO;
}

export interface CvRequestDTO {
  cv: CvDTO;
  design: {
    theme: "classic" | "modern" | "casual";
  };
  locale: {
    language: "spanish";
  };
  settings: {
    current_date: string;
  };
  output_name: string;
}

/**
 * Retorna la fecha actual en formato YYYY-MM-DD
 */
const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const slugifyName = (name: string) => {
  if (!name.trim()) return "cv_generado";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
};

/**
 * Valida que un email sea válido según reglas RenderCV:
 * - Contiene @
 * - Tiene dominio con al menos un punto
 * - Sufijo de 2+ letras
 * - No termina en punto
 */
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return false;
  
  // Regex: user@domain.XX (mínimo)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/;
  
  // Verificar que no termine en punto
  if (trimmed.endsWith(".")) return false;
  
  return emailRegex.test(trimmed);
}

/**
 * Valida que un phone sea válido:
 * - Debe contener 10 dígitos mínimo (para formato internacional)
 * - Idealmente debe empezar con +, ó ser solo números
 */
export function isValidPhone(phone: string): boolean {
  const trimmed = phone.trim();
  if (!trimmed) return false;
  
  // Contar solo dígitos
  const digitCount = trimmed.replace(/\D/g, "").length;
  
  // RenderCV requiere mínimo 10 dígitos para validar correctamente
  return digitCount >= 10;
}

/**
 * Retorna un mensaje descriptivo de por qué un phone es inválido
 */
export function getPhoneErrorMessage(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null; // Campo opcional
  
  const digitCount = trimmed.replace(/\D/g, "").length;
  
  if (digitCount < 10) {
    return `Teléfono debe tener al menos 10 dígitos. Tienes ${digitCount}.`;
  }
  
  if (digitCount > 20) {
    return "Teléfono tiene demasiados dígitos.";
  }
  
  return null;
}

/**
 * Formatea un teléfono para RenderCV:
 * - Si ya empieza con +, lo deja como está (formato: +57 XXX XXX XXXX)
 * - Si es solo dígitos con 57 al inicio, agrega + (formato: +57XXXXXXXXX)
 * - Si es solo dígitos sin 57, agrega +57 (formato: +57XXXXXXXXX)
 * - Si tiene espacios, preserva y agrega +57 al inicio
 */
export function formatPhoneNumber(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return "";
  
  // Si ya empieza con +, devuelve como está (preserva espacios y formato)
  if (trimmed.startsWith("+")) {
    return trimmed;
  }
  
  // Extraer solo dígitos para validar
  const onlyDigits = trimmed.replace(/\D/g, "");
  
  // Si ya tiene 57 al inicio, agregar solo el +
  if (onlyDigits.startsWith("57")) {
    return `+${onlyDigits}`;
  }
  
  // Si no tiene 57, agregar +57
  // Si el teléfono tiene espacios, preservarlos; si no, agregar espacio después de +57
  if (trimmed.includes(" ")) {
    return `+57 ${trimmed}`;
  }
  return `+57${onlyDigits}`;
}

/**
 * Limpia un string: trimea y omite si queda vacío
 */
export function cleanOptionalString(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Limpia email: valida y retorna lowercase, o undefined si es inválido
 */
export function cleanEmail(email: string | undefined): string | undefined {
  if (!email) return undefined;
  const trimmed = email.trim().toLowerCase();
  return isValidEmail(trimmed) ? trimmed : undefined;
}

/**
 * Limpia phone: retorna como string si es válido, undefined si está vacío
 * RenderCV requiere teléfono en formato internacional (+57 para Colombia)
 */
export function cleanPhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  const trimmed = phone.trim();
  if (!trimmed) return undefined;
  // Aplicar formateo completo
  return formatPhoneNumber(trimmed);
}

/** Párrafos o viñetas escritos por la persona: se separa por líneas, nunca por puntos ("S.A.S.", "3.5"). */
export const splitLines = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-•*·]\s*/, "").trim())
    .filter(Boolean);

const CURRENT = /\b(present|presente|actual|actualmente)\b/i;

/**
 * Extrae inicio y fin de textos como "2023-02 – 2026-06", "2023-02 – actual" o "2021".
 * Sin fechas devuelve vacío: nunca se inventan.
 */
export const parseRange = (duration: string): { start: string; end: string } => {
  const dates = duration.match(/\d{4}(?:-\d{2})?/g) ?? [];
  const start = dates[0] ?? "";
  const end = dates[1] ?? (start && CURRENT.test(duration) ? "present" : "");
  return { start, end };
};

const withDates = <T extends object>(entry: T, duration: string): T & { start_date?: string; end_date?: string } => {
  const { start, end } = parseRange(duration);
  return {
    ...entry,
    ...(start ? { start_date: start } : {}),
    ...(start && end ? { end_date: end } : {}),
  };
};

/**
 * Secciones del CV solo con lo que escribió la persona. Una sección vacía no se envía:
 * el PDF de un participante nunca debe incluir contenido que no ingresó.
 */
export const buildSections = (data: CVData): CvSectionsDTO => {
  const sections: CvSectionsDTO = {};

  const summary = splitLines(data.personalInfo.summary);
  if (summary.length) sections["Sobre mí"] = summary;

  const education = data.education
    .filter((edu) => edu.degree.trim() || edu.institution.trim())
    .map((edu) =>
      withDates(
        {
          institution: edu.institution.trim() || edu.degree.trim(),
          area: edu.degree.trim() || edu.institution.trim(),
        },
        edu.year,
      ),
    );
  if (education.length) sections["Educación"] = education;

  const experience = data.experience
    .filter((exp) => exp.position.trim() || exp.company.trim())
    .map((exp) => {
      const highlights = splitLines(exp.description);
      return withDates(
        {
          company: exp.company.trim() || exp.position.trim(),
          position: exp.position.trim() || exp.company.trim(),
          ...(highlights.length ? { highlights } : {}),
        },
        exp.duration,
      );
    });
  if (experience.length) sections["Experiencia"] = experience;

  const skills = data.skills.map((skill) => skill.trim()).filter(Boolean);
  if (skills.length) sections["Habilidades"] = [{ label: "Competencias", details: skills.join(", ") }];

  return sections;
};

export function mapCVDataToCvRequest(
  data: CVData,
  theme: "classic" | "modern" | "casual" = "classic"
): CvRequestDTO {
  // Construir CV base - MÍNIMO REQUERIDO: name
  const cvPayload: CvDTO = {
    name: data.personalInfo.name.trim() || "Profesional",
    sections: buildSections(data),
  };

  // El titular es el cargo más reciente que escribió la persona (no una frase del perfil).
  const headline = cleanOptionalString(data.experience.find((exp) => exp.position.trim())?.position);
  if (headline) {
    cvPayload.headline = headline;
  }

  // Agregar location si existe
  const cleanedLocation = cleanOptionalString(data.personalInfo.location);
  if (cleanedLocation) {
    cvPayload.location = cleanedLocation;
  }

  // Agregar email si existe (string o array)
  const cleanedEmail = cleanEmail(data.personalInfo.email);
  if (cleanedEmail) {
    cvPayload.email = cleanedEmail;
  }

  // Agregar phone si existe (como string, no número)
  const cleanedPhone = cleanPhone(data.personalInfo.phone);
  if (cleanedPhone) {
    cvPayload.phone = cleanedPhone;
  }

  return {
    cv: cvPayload,
    design: {
      theme,
    },
    locale: {
      language: "spanish",
    },
    settings: {
      current_date: getTodayDateString(),
    },
    output_name: slugifyName(data.personalInfo.name || "cv_generado"),
  };
}
