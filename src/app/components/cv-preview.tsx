import { CVData } from "./cv-form";
import { Mail, Phone, MapPin } from "lucide-react";

interface CVPreviewProps {
  data: CVData;
}

export function CVPreview({ data }: CVPreviewProps) {
  return (
    <div className="h-full overflow-y-auto p-8 bg-white">
      <div className="max-w-3xl mx-auto bg-white shadow-lg border border-gray-200 p-10">
        {/* Header */}
        <div className="border-b-2 border-gray-800 pb-6 mb-6">
          <h1 className="text-4xl mb-3 text-gray-800">
            {data.personalInfo.name || "Tu Nombre"}
          </h1>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {data.personalInfo.email && (
              <div className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                <span>{data.personalInfo.email}</span>
              </div>
            )}
            {data.personalInfo.phone && (
              <div className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                <span>{data.personalInfo.phone}</span>
              </div>
            )}
            {data.personalInfo.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{data.personalInfo.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Resumen Profesional */}
        {data.personalInfo.summary && (
          <section className="mb-6">
            <h2 className="text-xl mb-3 text-gray-800 uppercase tracking-wide border-b border-gray-300 pb-2">
              Perfil Profesional
            </h2>
            <p className="text-gray-700 leading-relaxed">{data.personalInfo.summary}</p>
          </section>
        )}

        {/* Experiencia Laboral */}
        {data.experience.length > 0 && data.experience.some(exp => exp.position || exp.company) && (
          <section className="mb-6">
            <h2 className="text-xl mb-3 text-gray-800 uppercase tracking-wide border-b border-gray-300 pb-2">
              Experiencia Laboral
            </h2>
            <div className="space-y-4">
              {data.experience.map((exp, index) => {
                if (!exp.position && !exp.company) return null;
                return (
                  <div key={index}>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-lg text-gray-800">
                        {exp.position || "Cargo"}
                      </h3>
                      {exp.duration && (
                        <span className="text-sm text-gray-600 italic">{exp.duration}</span>
                      )}
                    </div>
                    {exp.company && (
                      <p className="text-gray-600 mb-2">{exp.company}</p>
                    )}
                    {exp.description && (
                      <p className="text-gray-700 leading-relaxed">{exp.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Educación */}
        {data.education.length > 0 && data.education.some(edu => edu.degree || edu.institution) && (
          <section className="mb-6">
            <h2 className="text-xl mb-3 text-gray-800 uppercase tracking-wide border-b border-gray-300 pb-2">
              Educación
            </h2>
            <div className="space-y-3">
              {data.education.map((edu, index) => {
                if (!edu.degree && !edu.institution) return null;
                return (
                  <div key={index}>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-lg text-gray-800">
                        {edu.degree || "Título"}
                      </h3>
                      {edu.year && (
                        <span className="text-sm text-gray-600 italic">{edu.year}</span>
                      )}
                    </div>
                    {edu.institution && (
                      <p className="text-gray-600">{edu.institution}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Habilidades */}
        {data.skills.length > 0 && (
          <section>
            <h2 className="text-xl mb-3 text-gray-800 uppercase tracking-wide border-b border-gray-300 pb-2">
              Habilidades
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!data.personalInfo.name && !data.personalInfo.summary && 
         data.experience.length === 0 && data.education.length === 0 && 
         data.skills.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>Completa el formulario para ver tu hoja de vida aquí</p>
          </div>
        )}
      </div>
    </div>
  );
}
