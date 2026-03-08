import { useState } from "react";

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

interface CVFormProps {
  data: CVData;
  onChange: (data: CVData) => void;
}

export function CVForm({ data, onChange }: CVFormProps) {
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
      skills: value.split(",").map((s) => s.trim()).filter(Boolean),
    });
  };

  return (
    <div className="h-full overflow-y-auto p-8 bg-gray-50">
      <h2 className="text-2xl mb-6">Información de la Hoja de Vida</h2>

      {/* Información Personal */}
      <section className="mb-8">
        <h3 className="text-lg mb-4 text-gray-700">Información Personal</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1 text-gray-600">Nombre completo</label>
            <input
              type="text"
              value={data.personalInfo.name}
              onChange={(e) => updatePersonalInfo("name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Juan Pérez"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-600">Email</label>
            <input
              type="email"
              value={data.personalInfo.email}
              onChange={(e) => updatePersonalInfo("email", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-600">Teléfono</label>
            <input
              type="tel"
              value={data.personalInfo.phone}
              onChange={(e) => updatePersonalInfo("phone", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+34 123 456 789"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-600">Ubicación</label>
            <input
              type="text"
              value={data.personalInfo.location}
              onChange={(e) => updatePersonalInfo("location", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ciudad, País"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-600">Resumen profesional</label>
            <textarea
              value={data.personalInfo.summary}
              onChange={(e) => updatePersonalInfo("summary", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
              placeholder="Breve descripción de tu perfil profesional..."
            />
          </div>
        </div>
      </section>

      {/* Experiencia */}
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
                placeholder="Duración (Ej: Enero 2020 - Presente)"
              />
              <textarea
                value={exp.description}
                onChange={(e) => updateExperience(index, "description", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                placeholder="Descripción de responsabilidades..."
              />
            </div>
          </div>
        ))}
      </section>

      {/* Educación */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg text-gray-700">Educación</h3>
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
              <span className="text-sm text-gray-500">Educación {index + 1}</span>
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
                placeholder="Título/Grado"
              />
              <input
                type="text"
                value={edu.institution}
                onChange={(e) => updateEducation(index, "institution", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Institución"
              />
              <input
                type="text"
                value={edu.year}
                onChange={(e) => updateEducation(index, "year", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Año (Ej: 2015 - 2019)"
              />
            </div>
          </div>
        ))}
      </section>

      {/* Habilidades */}
      <section className="mb-8">
        <h3 className="text-lg mb-4 text-gray-700">Habilidades</h3>
        <div>
          <label className="block text-sm mb-1 text-gray-600">
            Ingresa las habilidades separadas por comas
          </label>
          <input
            type="text"
            value={data.skills.join(", ")}
            onChange={(e) => updateSkills(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="JavaScript, React, Node.js, etc."
          />
        </div>
      </section>
    </div>
  );
}
