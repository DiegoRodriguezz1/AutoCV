import { useState } from "react";
import { CVForm, CVData } from "../components/cv-form";
import { CVPreview } from "../components/cv-preview";
import { FileText, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router";

export function CVCreatorPage() {
  const navigate = useNavigate();
  const [cvData, setCvData] = useState<CVData>({
    personalInfo: {
      name: "",
      email: "",
      phone: "",
      location: "",
      summary: "",
    },
    experience: [],
    education: [],
    skills: [],
  });

  const handleApplyCV = () => {
    navigate("/jobs");
  };

  return (
    <div className="size-full flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <span className="text-xl text-gray-900">CVExpress AI</span>
          </div>
        </div>
        <button
          onClick={handleApplyCV}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Aplicar CV
        </button>
      </header>

      {/* Contenido principal */}
      <div className="flex-1 flex overflow-hidden">
        {/* Formulario a la izquierda */}
        <div className="w-1/2 border-r border-gray-300">
          <CVForm data={cvData} onChange={setCvData} />
        </div>

        {/* Previsualizador a la derecha */}
        <div className="w-1/2">
          <CVPreview data={cvData} />
        </div>
      </div>
    </div>
  );
}