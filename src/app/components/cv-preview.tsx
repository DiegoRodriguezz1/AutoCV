import { Mail, MapPin, Phone, FileText, Calendar } from "lucide-react";
import { CVData } from "./cv-form";

interface CVPreviewProps {
  data: CVData;
  generatedPdfBase64?: string | null;
  onClearGeneratedPdf?: () => void;
}

export function CVPreview({
  data,
  generatedPdfBase64,
  onClearGeneratedPdf,
}: CVPreviewProps) {
  if (generatedPdfBase64) {
    const dataUrl = `data:application/pdf;base64,${generatedPdfBase64}`;

    return (
      <div className="h-full p-4 bg-gray-100 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">CV generado por API</h3>
          {onClearGeneratedPdf && (
            <button
              onClick={onClearGeneratedPdf}
              className="px-3 py-1.5 text-sm rounded-md bg-white border border-gray-300 hover:bg-gray-50"
            >
              Volver a vista editable
            </button>
          )}
        </div>
        <iframe
          title="CV generado"
          src={dataUrl}
          className="w-full flex-1 rounded-md border border-gray-300 bg-white"
        />
      </div>
    );
  }

  const isEmpty =
    !data.personalInfo.name &&
    !data.personalInfo.summary &&
    data.experience.length === 0 &&
    data.education.length === 0 &&
    data.skills.length === 0;

  const today = new Date();
  const formattedDate = `${today.toLocaleString("es-ES", { month: "long", year: "numeric" })}`;

  return (
    <div className="h-full overflow-y-auto p-6 bg-gray-50">
      <div id="cv-preview" className="max-w-3xl mx-auto bg-white shadow-lg p-12">
        {isEmpty ? (
          <div className="text-center py-16 text-gray-400">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-lg">Completa el formulario para ver tu CV aquí</p>
          </div>
        ) : (
          <>
            {/* Última actualización */}
            <div className="text-right text-xs text-gray-400 mb-6">
              Última actualización {formattedDate}
            </div>

            {/* Encabezado - Nombre y Título */}
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-blue-600 mb-2">
                {data.personalInfo.name || "Tu Nombre"}
              </h1>
              {data.experience.length > 0 && data.experience[0]?.position && (
                <h2 className="text-lg text-gray-600 font-medium">
                  {data.experience[0].position}
                </h2>
              )}
            </div>

            {/* Datos de Contacto */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 border-t-2 border-b-2 border-gray-300 py-3 mb-6">
              {data.personalInfo.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>{data.personalInfo.location}</span>
                </div>
              )}
              {data.personalInfo.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>{data.personalInfo.email}</span>
                </div>
              )}
              {data.personalInfo.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>{data.personalInfo.phone}</span>
                </div>
              )}
            </div>

            {/* Sección: Sobre mí / Perfil */}
            {data.personalInfo.summary && (
              <section className="mb-6">
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-2">
                  Sobre mí
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {data.personalInfo.summary}
                </p>
              </section>
            )}

            {/* Sección: Educación */}
            {data.education.length > 0 &&
              data.education.some((edu) => edu.degree || edu.institution) && (
                <section className="mb-6">
                  <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-3">
                    Educación
                  </h3>
                  <div className="space-y-3">
                    {data.education.map((edu, index) => {
                      if (!edu.degree && !edu.institution) return null;
                      return (
                        <div key={index} className="flex gap-4">
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-bold text-gray-800 text-sm">
                                {edu.degree || "Título"}
                              </h4>
                              {edu.year && (
                                <span className="text-xs text-gray-600">{edu.year}</span>
                              )}
                            </div>
                            {edu.institution && (
                              <p className="text-sm text-gray-600">{edu.institution}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

            {/* Sección: Experiencia */}
            {data.experience.length > 0 &&
              data.experience.some((exp) => exp.position || exp.company) && (
                <section className="mb-6">
                  <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-3">
                    Experiencia
                  </h3>
                  <div className="space-y-4">
                    {data.experience.map((exp, index) => {
                      if (!exp.position && !exp.company) return null;
                      return (
                        <div key={index}>
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <h4 className="font-bold text-gray-800 text-sm">
                                {exp.position || "Cargo"}
                              </h4>
                              {exp.company && (
                                <p className="text-sm text-gray-600">{exp.company}</p>
                              )}
                            </div>
                            {exp.duration && (
                              <span className="text-xs text-gray-600 whitespace-nowrap ml-4">
                                {exp.duration}
                              </span>
                            )}
                          </div>
                          {exp.description && (
                            <p className="text-sm text-gray-700 leading-relaxed mt-2">
                              {exp.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

            {/* Sección: Habilidades */}
            {data.skills.length > 0 && (
              <section>
                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wide mb-3">
                  Habilidades
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {data.skills.map((skill, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                      <span className="text-gray-700">{skill}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
