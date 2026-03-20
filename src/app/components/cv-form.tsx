import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle } from "lucide-react";
import { isValidEmail, getPhoneErrorMessage } from "../dto/cv-api";

/**
 * Filtra solo dígitos de un string de teléfono
 */
export function phoneInputFilter(value: string): string {
  return value.replace(/\D/g, "");
}

export interface CVData {
  personalInfo: {
    name: string;
    email: string;
    phone: string;
    location: string;
    summary: string;
  };
  experience: {
    position: string;
    company: string;
    duration: string;
    description: string;
  }[];
  education: {
    degree: string;
    institution: string;
    year: string;
  }[];
  skills: string[];
}

interface ValidationErrors {
  [key: string]: string | undefined;
}

interface CVFormProps {
  data: CVData;
  onChange: (data: CVData) => void;
  onValidationChange?: (isValid: boolean, errors: Record<string, string>) => void;
}

function areErrorMapsEqual(
  left: Record<string, string | undefined>,
  right: Record<string, string | undefined>,
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => left[key] === right[key]);
}

export function CVForm({ data, onChange, onValidationChange }: CVFormProps) {
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Validar datos en tiempo real
  // Solo requerimos el nombre - el resto es opcional para ayudar al usuario
  useEffect(() => {
    const newErrors: ValidationErrors = {};

    // name es obligatorio
    if (!data.personalInfo.name.trim()) {
      newErrors.name = "El nombre es obligatorio";
    }

    // email es completamente opcional (sin validación pedante)
    // Solo mostrar error si tiene contenido inválido obvio
    if (data.personalInfo.email.trim() && data.personalInfo.email.trim().length < 5) {
      newErrors.email = "Email debe tener formato válido";
    }

    setErrors((prev) => (areErrorMapsEqual(prev, newErrors) ? prev : newErrors));

    // Notificar padre si validación cambió
    const isValid = Object.keys(newErrors).length === 0;
    const errorsToNotify = Object.fromEntries(
      Object.entries(newErrors).filter(([, v]) => v !== undefined)
    ) as Record<string, string>;
    onValidationChange?.(isValid, errorsToNotify);
  }, [data.personalInfo, onValidationChange]);

  const renderFieldWithValidation = (
    label: string,
    value: string,
    fieldName: string,
    onChangeValue: (value: string) => void,
    placeholder: string,
    type: string = "text",
    isRequired: boolean = false,
  ) => {
    const hasError = !!errors[fieldName];
    const isValid = !hasError && value.trim() !== "" && (type !== "email" || isValidEmail(value));

    return (
      <div>
        <label className="block text-sm mb-2 text-gray-600">
          <span>{label}</span>
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="relative">
          <input
            type={type}
            value={value}
            onChange={(e) => onChangeValue(e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition ${
              hasError
                ? "border-red-300 focus:ring-red-500 bg-red-50"
                : isValid
                  ? "border-green-300 focus:ring-green-500 bg-green-50"
                  : "border-gray-300 focus:ring-blue-500"
            }`}
            placeholder={placeholder}
          />
          {hasError && (
            <AlertCircle className="absolute right-3 top-2.5 w-5 h-5 text-red-500" />
          )}
          {isValid && (
            <CheckCircle className="absolute right-3 top-2.5 w-5 h-5 text-green-500" />
          )}
        </div>
        {hasError && <p className="mt-1 text-xs text-red-600">{errors[fieldName]}</p>}
      </div>
    );
  };

  const updatePersonalInfo = (field: string, value: string) => {
    onChange({
      ...data,
      personalInfo: { ...data.personalInfo, [field]: value },
    });
  };

  const updateExperience = (index: number, field: string, value: string) => {
    const newExperience = [...data.experience];
    newExperience[index] = { ...newExperience[index], [field]: value };
    onChange({ ...data, experience: newExperience });
  };

  const addExperience = () => {
    onChange({
      ...data,
      experience: [
        ...data.experience,
        { position: "", company: "", duration: "", description: "" },
      ],
    });
  };

  const removeExperience = (index: number) => {
    onChange({
      ...data,
      experience: data.experience.filter((_, i) => i !== index),
    });
  };

  const updateEducation = (index: number, field: string, value: string) => {
    const newEducation = [...data.education];
    newEducation[index] = { ...newEducation[index], [field]: value };
    onChange({ ...data, education: newEducation });
  };

  const addEducation = () => {
    onChange({
      ...data,
      education: [...data.education, { degree: "", institution: "", year: "" }],
    });
  };

  const removeEducation = (index: number) => {
    onChange({
      ...data,
      education: data.education.filter((_, i) => i !== index),
    });
  };

  const updateSkills = (value: string) => {
    onChange({
      ...data,
      skills: value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  };

  return (
    <div className="h-full overflow-y-auto p-8 bg-gray-50">
      <h2 className="text-2xl mb-6 text-gray-900">Información de la Hoja de Vida</h2>

      {/* Sección Información Personal */}
      <section className="mb-8 p-6 bg-white rounded-lg border border-gray-200">
        <h3 className="text-lg mb-4 text-gray-700 font-semibold">Información Personal</h3>
        <div className="space-y-4">
          {renderFieldWithValidation(
            "Nombre completo",
            data.personalInfo.name,
            "name",
            (value) => updatePersonalInfo("name", value),
            "Ej: Diego Rodriguez",
            "text",
            true,
          )}

          {renderFieldWithValidation(
            "Email",
            data.personalInfo.email,
            "email",
            (value) => updatePersonalInfo("email", value),
            "correo@ejemplo.com",
            "email",
            false,
          )}

          {renderFieldWithValidation(
            "Teléfono",
            data.personalInfo.phone,
            "phone",
            (value) => updatePersonalInfo("phone", phoneInputFilter(value)),
            "Ej: 3053973956 (solo números)",
            "text",
            false,
          )}
          <p className="text-xs text-gray-500 ml-1">Solo números (mínimo 10 dígitos). Se enviará con código de país automáticamente.</p>

          {renderFieldWithValidation(
            "Ubicación",
            data.personalInfo.location,
            "location",
            (value) => updatePersonalInfo("location", value),
            "Ej: Bogotá, Colombia",
            "text",
            false,
          )}

          <div>
            <label className="block text-sm mb-1 text-gray-600">Resumen profesional</label>
            <textarea
              value={data.personalInfo.summary}
              onChange={(e) => updatePersonalInfo("summary", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
              placeholder="Describe tu perfil y fortalezas..."
            />
          </div>
        </div>
      </section>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg text-gray-700">Experiencia Laboral</h3>
          <button
            onClick={addExperience}
            className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
          >
            + Agregar
          </button>
        </div>
        {data.experience.map((exp, index) => (
          <div key={index} className="mb-4 p-4 bg-white rounded-md border border-gray-200">
            <div className="flex justify-between items-start mb-3">
              <span className="text-sm text-gray-500">Experiencia {index + 1}</span>
              <button
                onClick={() => removeExperience(index)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Eliminar
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={exp.position}
                onChange={(e) => updateExperience(index, "position", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Cargo"
              />
              <input
                type="text"
                value={exp.company}
                onChange={(e) => updateExperience(index, "company", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Empresa"
              />
              <input
                type="text"
                value={exp.duration}
                onChange={(e) => updateExperience(index, "duration", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Duracion (Ej: 2024-02 - present)"
              />
              <textarea
                value={exp.description}
                onChange={(e) => updateExperience(index, "description", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                placeholder="Responsabilidades y logros..."
              />
            </div>
          </div>
        ))}
      </section>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg text-gray-700">Educacion</h3>
          <button
            onClick={addEducation}
            className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
          >
            + Agregar
          </button>
        </div>
        {data.education.map((edu, index) => (
          <div key={index} className="mb-4 p-4 bg-white rounded-md border border-gray-200">
            <div className="flex justify-between items-start mb-3">
              <span className="text-sm text-gray-500">Educacion {index + 1}</span>
              <button
                onClick={() => removeEducation(index)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Eliminar
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={edu.degree}
                onChange={(e) => updateEducation(index, "degree", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Titulo/Grado"
              />
              <input
                type="text"
                value={edu.institution}
                onChange={(e) => updateEducation(index, "institution", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Institucion"
              />
              <input
                type="text"
                value={edu.year}
                onChange={(e) => updateEducation(index, "year", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Anio o rango (Ej: 2022-01 - 2024-01)"
              />
            </div>
          </div>
        ))}
      </section>

      <section className="mb-8">
        <h3 className="text-lg mb-4 text-gray-700">Habilidades</h3>
        <label className="block text-sm mb-1 text-gray-600">
          Ingresa habilidades separadas por comas
        </label>
        <input
          type="text"
          value={data.skills.join(", ")}
          onChange={(e) => updateSkills(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Java, React, FastAPI, AWS, ..."
        />
      </section>
    </div>
  );
}
