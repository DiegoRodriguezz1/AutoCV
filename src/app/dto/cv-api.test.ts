import { describe, expect, it } from "vitest";

import { buildSections, formatPhoneNumber, isValidEmail, mapCVDataToCvRequest, parseRange, splitLines } from "./cv-api";
import type { CVData } from "./cv-data";

const emptyCv = (): CVData => ({
  personalInfo: { name: "Ana Pérez", email: "", phone: "", location: "", summary: "" },
  experience: [],
  education: [],
  skills: [],
});

describe("buildSections: solo lo que escribió la persona", () => {
  it("con el CV vacío no envía ninguna sección (antes inventaba experiencia y habilidades)", () => {
    expect(buildSections(emptyCv())).toEqual({});
  });

  it("no rellena fechas, ubicaciones ni descripciones que la persona no dio", () => {
    const cv = emptyCv();
    cv.experience = [{ position: "Auxiliar", company: "Colegio", duration: "", description: "" }];
    cv.education = [{ degree: "Bachiller", institution: "IED Kennedy", year: "" }];
    expect(buildSections(cv)).toEqual({
      Experiencia: [{ company: "Colegio", position: "Auxiliar" }],
      Educación: [{ institution: "IED Kennedy", area: "Bachiller" }],
    });
  });

  it("el título va en `area` y no en `degree` (columna angosta de RenderCV)", () => {
    const cv = emptyCv();
    cv.education = [{ degree: "Tecnología en Desarrollo de Software", institution: "ETITC", year: "2023-02 – actual" }];
    const [entry] = buildSections(cv)["Educación"] as Record<string, string>[];
    expect(entry).toEqual({
      institution: "ETITC",
      area: "Tecnología en Desarrollo de Software",
      start_date: "2023-02",
      end_date: "present",
    });
    expect(entry).not.toHaveProperty("degree");
  });

  it("si falta empresa o institución usa el otro dato, porque RenderCV exige ambos", () => {
    const cv = emptyCv();
    cv.experience = [{ position: "Freelance", company: "", duration: "", description: "" }];
    cv.education = [{ degree: "", institution: "SENA", year: "" }];
    const sections = buildSections(cv);
    expect(sections["Experiencia"]).toEqual([{ company: "Freelance", position: "Freelance" }]);
    expect(sections["Educación"]).toEqual([{ institution: "SENA", area: "SENA" }]);
  });

  it("omite entradas totalmente vacías", () => {
    const cv = emptyCv();
    cv.experience = [{ position: "  ", company: "", duration: "2024-01", description: "x" }];
    expect(buildSections(cv)).toEqual({});
  });

  it("los logros se separan por línea, no por punto (S.A.S., 3.5)", () => {
    const cv = emptyCv();
    cv.experience = [
      {
        position: "Analista",
        company: "Acme S.A.S.",
        duration: "2024-01 – 2025-06",
        description: "- Subí la nota a 3.5 en S.A.S.\n• Lideré 4 personas\n\n",
      },
    ];
    const [entry] = buildSections(cv)["Experiencia"] as Record<string, unknown>[];
    expect(entry.highlights).toEqual(["Subí la nota a 3.5 en S.A.S.", "Lideré 4 personas"]);
    expect(entry).not.toHaveProperty("summary");
  });

  it("las habilidades van en una sola línea", () => {
    const cv = emptyCv();
    cv.skills = ["Python", " ", "SQL", "Trabajo en equipo"];
    expect(buildSections(cv)["Habilidades"]).toEqual([{ label: "Competencias", details: "Python, SQL, Trabajo en equipo" }]);
  });

  it("el perfil conserva sus párrafos y la puntuación", () => {
    const cv = emptyCv();
    cv.personalInfo.summary = "Tecnóloga en software. Me gusta React.\nBusco práctica.";
    expect(buildSections(cv)["Sobre mí"]).toEqual(["Tecnóloga en software. Me gusta React.", "Busco práctica."]);
  });
});

describe("parseRange", () => {
  it.each([
    ["2023-02 – 2026-06", { start: "2023-02", end: "2026-06" }],
    ["2023-02 – actual", { start: "2023-02", end: "present" }],
    ["2021 - present", { start: "2021", end: "present" }],
    ["2020", { start: "2020", end: "" }],
    ["", { start: "", end: "" }],
    ["hace un tiempo", { start: "", end: "" }],
  ])("%s", (text, expected) => {
    expect(parseRange(text)).toEqual(expected);
  });
});

describe("splitLines", () => {
  it("quita viñetas y líneas vacías", () => {
    expect(splitLines("* uno\n\n - dos\r\n· tres")).toEqual(["uno", "dos", "tres"]);
  });
});

describe("mapCVDataToCvRequest", () => {
  it("usa el cargo más reciente como titular y no una frase del perfil", () => {
    const cv = emptyCv();
    cv.personalInfo.summary = "Soy muy proactiva. Me gusta aprender.";
    expect(mapCVDataToCvRequest(cv).cv.headline).toBeUndefined();
    cv.experience = [{ position: "Desarrolladora", company: "Acme", duration: "", description: "" }];
    expect(mapCVDataToCvRequest(cv).cv.headline).toBe("Desarrolladora");
  });

  it("descarta un correo inválido y conserva uno válido", () => {
    const cv = emptyCv();
    cv.personalInfo.email = "ana@correo";
    expect(mapCVDataToCvRequest(cv).cv.email).toBeUndefined();
    cv.personalInfo.email = " Ana@Correo.com ";
    expect(mapCVDataToCvRequest(cv).cv.email).toBe("ana@correo.com");
  });

  it("envía el tema elegido y un nombre de archivo sin tildes", () => {
    const request = mapCVDataToCvRequest({ ...emptyCv(), personalInfo: { ...emptyCv().personalInfo, name: "José Ñúñez" } }, "modern");
    expect(request.design.theme).toBe("modern");
    expect(request.output_name).toBe("jose_nunez");
  });
});

describe("contacto", () => {
  it.each([
    ["ana@correo.com", true],
    ["ana@correo.c", false], // el backend exige dominio de 2+ letras
    ["ana@correo.com.co", true],
    ["ana@correo", false],
    ["ana@correo.com.", false],
    ["", false],
  ])("isValidEmail(%s) = %s", (email, valid) => {
    expect(isValidEmail(email)).toBe(valid);
  });

  it.each([
    ["+57 300 1234567", "+57 300 1234567"],
    ["3001234567", "+573001234567"],
    ["573001234567", "+573001234567"],
  ])("formatPhoneNumber(%s)", (raw, expected) => {
    expect(formatPhoneNumber(raw)).toBe(expected);
  });
});
