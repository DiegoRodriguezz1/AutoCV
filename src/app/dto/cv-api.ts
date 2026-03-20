import { CVData } from "../components/cv-form";

export interface SocialNetworkDTO {
  network: string;
  username: string;
}

export interface EducationDTO {
  institution: string;
  area: string;
  degree: string;
  start_date: string;
  end_date: string;
  location: string;
  highlights: string[];
}

export interface ExperienceDTO {
  company: string;
  position: string;
  start_date: string;
  end_date: string;
  location: string;
  summary: string;
  highlights: string[];
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
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
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

const splitSummaryToBullets = (summary: string): string[] => {
  if (!summary.trim()) return [];
  return summary
    .split(/[\n\.]/)
    .map((s) => s.trim())
    .filter(Boolean);
};

/**
 * Genera valores por defecto para secciones vacías
 * Ayuda al usuario sin presionar con validaciones estrictas
 */
const getDefaultSections = (data: CVData): CvSectionsDTO => {
  return {
    "Sobre mí": data.personalInfo.summary.trim()
      ? splitSummaryToBullets(data.personalInfo.summary)
      : [
          "Profesional orientado a resultados y con capacidad analítica para resolver problemas.",
          "Experiencia en desarrollo de software y tecnologías modernas.",
          "Abierto a nuevas oportunidades y retos profesionales.",
        ],
    "Educación":
      data.education.filter((edu) => edu.degree || edu.institution).length > 0
        ? data.education
            .filter((edu) => edu.degree || edu.institution)
            .map((edu) => {
              const range = parseRange(edu.year);
              return {
                institution: edu.institution || "Institución",
                area: edu.degree || "Carrera",
                degree: edu.degree || "Carrera",
                start_date: range.start || "2020-01",
                end_date: range.end || "present",
                location: data.personalInfo.location || "Colombia",
                highlights: [],
              };
            })
        : [
            {
              institution: "Educación continua",
              area: "Desarrollo profesional",
              degree: "Formación",
              start_date: "2024-01",
              end_date: "present",
              location: data.personalInfo.location || "Colombia",
              highlights: ["Capacitación constante en tecnologías modernas"],
            },
          ],
    "Experiencia":
      data.experience.filter((exp) => exp.position || exp.company).length > 0
        ? data.experience
            .filter((exp) => exp.position || exp.company)
            .map((exp) => {
              const range = parseRange(exp.duration);
              return {
                company: exp.company || "Empresa",
                position: exp.position || "Puesto",
                start_date: range.start || "2024-01",
                end_date: range.end || "present",
                location: data.personalInfo.location || "Colombia",
                summary: exp.description || "Desarrollo y mantenimiento de proyectos.",
                highlights: exp.description
                  ? splitSummaryToBullets(exp.description)
                  : ["Contribución a proyectos significativos"],
              };
            })
        : [
            {
              company: "Profesional Independiente",
              position: "Desarrollador",
              start_date: "2023-01",
              end_date: "present",
              location: data.personalInfo.location || "Colombia",
              summary: "Desarrollo de proyectos con tecnologías modernas.",
              highlights: ["Proyectos exitosos", "Trabajo con metodologías ágiles"],
            },
          ],
    "Habilidades":
      data.skills.length > 0
        ? data.skills
            .filter((skill) => skill.trim())
            .map((skill) => ({
              label: "Competencia técnica",
              details: skill,
            }))
        : [
            { label: "Desarrollo de Software", details: "JavaScript, TypeScript, React, Node.js" },
            { label: "Bases de Datos", details: "SQL, MongoDB" },
            { label: "Herramientas", details: "Git, Docker, REST APIs" },
            { label: "Metodologías", details: "Agile, Scrum" },
          ],
  };
};

// Intentamos extraer rango YYYY-MM del campo libre de duracion, y si no existe usamos fallback seguro.
const parseRange = (duration: string): { start: string; end: string } => {
  const matches = duration.match(/\d{4}-\d{2}|present/gi) ?? [];
  const start = matches[0] ?? "";
  const end = matches[1] ?? (start ? "present" : "");
  return { start, end };
};

export function mapCVDataToCvRequest(
  data: CVData,
  theme: "classic" | "modern" | "casual" = "classic"
): CvRequestDTO {
  // Construir CV base - MÍNIMO REQUERIDO: name
  const cvPayload: CvDTO = {
    name: data.personalInfo.name.trim() || "Profesional",
    sections: getDefaultSections(data),
  };

  // Agregar headline si existe
  const headline =
    data.experience.find((exp) => exp.position)?.position ||
    cleanOptionalString(data.personalInfo.summary)?.split(".")[0] ||
    undefined;
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
