import { useState } from "react";
import { CVData } from "../components/cv-form";
import {
  Briefcase,
  MapPin,
  DollarSign,
  Clock,
  Building2,
  Heart,
  Share2,
  Eye,
  ChevronDown,
  Bell,
  ArrowLeft,
  Star,
  Filter,
} from "lucide-react";
import { Link } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  modality: string;
  postedTime: string;
  description: string;
  highlighted?: boolean;
  logo?: string;
  matchPercentage?: number;
}

interface JobsPageProps {
  cvData?: CVData;
}

export function JobsPage({ cvData }: JobsPageProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());

  // Generar ofertas basadas en el CV del usuario
  const jobs: Job[] = [
    {
      id: "1",
      title: "Técnico de operaciones / Programador de Rutas / Gestor de Operaciones de Transporte",
      company: "Importante empresa del sector",
      location: "Bogotá, D.C., Bogotá, D.C.",
      salary: "$ 1.671.468,00 (Mensual) PRUEBA",
      type: "Contrato de Obra o labor",
      modality: "Presencial",
      postedTime: "Hace 34 minutos",
      description:
        "¡ÚNETE A NUESTRO EQUIPO LOGÍSTICO! ¿Tienes experiencia en operaciones logísticas y conocimiento de la malla vial de Bogotá y sus alrededores? Esta es tu oportunidad para crecer profesionalmente en una empresa líder en soluciones de transporte y logística.",
      highlighted: true,
      matchPercentage: 95,
    },
    {
      id: "2",
      title: "Controlador de tráfico / Programador de Rutas / Gestor de Operaciones de Transporte",
      company: "Importante empresa del sector",
      location: "Bogotá, D.C., Bogotá, D.C.",
      salary: "$ 1.671.468,00 (Mensual)",
      type: "Contrato de Obra o labor",
      modality: "Presencial",
      postedTime: "Hace 35 minutos",
      description:
        "Estamos buscando un Auxiliar de Logística y Programación de Servicios, una persona con habilidades excepcionales en la coordinación de operaciones de transporte. Experiencia en manejo de software de logística.",
      highlighted: true,
      matchPercentage: 92,
    },
    {
      id: "3",
      title: "Desarrollador Full Stack Senior",
      company: "TechCorp Solutions",
      location: "Remoto",
      salary: "$ 8.000.000 - $ 12.000.000 (Mensual)",
      type: "Tiempo Completo",
      modality: "Remoto",
      postedTime: "Hace 2 horas",
      description:
        "Buscamos un desarrollador Full Stack con experiencia en React, Node.js y bases de datos. Trabajo en proyectos innovadores con tecnología de punta.",
      matchPercentage: 88,
    },
    {
      id: "4",
      title: "Product Manager",
      company: "StartUp Innovadora",
      location: "Medellín, Antioquia",
      salary: "$ 6.500.000 - $ 9.000.000 (Mensual)",
      type: "Tiempo Completo",
      modality: "Híbrido",
      postedTime: "Hace 5 horas",
      description:
        "Estamos buscando un Product Manager con experiencia en metodologías ágiles. Liderarás el desarrollo de nuevos productos digitales.",
      matchPercentage: 85,
    },
    {
      id: "5",
      title: "Especialista en Marketing Digital",
      company: "Agencia Creativa 360",
      location: "Bogotá, D.C.",
      salary: "$ 3.500.000 - $ 5.000.000 (Mensual)",
      type: "Tiempo Completo",
      modality: "Presencial",
      postedTime: "Hace 1 día",
      description:
        "Únete a nuestro equipo creativo. Buscamos especialista en SEO, SEM, redes sociales y análisis de métricas. Ambiente joven y dinámico.",
      matchPercentage: 82,
    },
    {
      id: "6",
      title: "Analista de Datos",
      company: "DataTech Colombia",
      location: "Cali, Valle del Cauca",
      salary: "$ 4.500.000 - $ 6.500.000 (Mensual)",
      type: "Tiempo Completo",
      modality: "Remoto",
      postedTime: "Hace 1 día",
      description:
        "Buscamos analista con experiencia en Python, SQL y herramientas de visualización. Proyectos de análisis predictivo y big data.",
      matchPercentage: 80,
    },
    {
      id: "7",
      title: "Gerente de Operaciones",
      company: "Corporación Industrial",
      location: "Barranquilla, Atlántico",
      salary: "$ 7.000.000 - $ 10.000.000 (Mensual)",
      type: "Tiempo Completo",
      modality: "Presencial",
      postedTime: "Hace 2 días",
      description:
        "Gerente con experiencia en optimización de procesos y gestión de equipos. Liderazgo en planta de producción con más de 100 empleados.",
      matchPercentage: 78,
    },
    {
      id: "8",
      title: "Diseñador UX/UI Senior",
      company: "Digital Agency Pro",
      location: "Bogotá, D.C.",
      salary: "$ 5.000.000 - $ 7.500.000 (Mensual)",
      type: "Tiempo Completo",
      modality: "Híbrido",
      postedTime: "Hace 3 días",
      description:
        "Diseñador con portfolio sólido en aplicaciones web y móviles. Conocimiento en Figma, Adobe XD y metodologías de diseño centrado en el usuario.",
      matchPercentage: 75,
    },
  ];

  const toggleSaveJob = (jobId: string) => {
    setSavedJobs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
  };

  return (
    <div className="size-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-6">
            <Link
              to="/create"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Volver a mi CV</span>
            </Link>
            <h1 className="text-2xl text-gray-900">Ofertas para ti</h1>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition">
            <Bell className="w-5 h-5" />
            <span>Crear alerta</span>
          </button>
        </div>
      </header>

      {/* Filtros */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <span>Ordenar</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <span>Fecha</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <span>Lugar de trabajo</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <span>Experiencia</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <span>Salario</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          <button className="ml-auto flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
            <Filter className="w-4 h-4" />
            <span>Más filtros</span>
          </button>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto flex gap-6 p-6">
          {/* Lista de trabajos */}
          <div className="w-2/5 flex flex-col gap-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600">
                <span className="text-gray-900">981</span> Ofertas de trabajo adaptadas a tu perfil
              </p>
              <button className="px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-500 transition flex items-center gap-2">
                Crear alerta
                <Bell className="w-4 h-4" />
              </button>
            </div>

            {jobs.map((job) => (
              <div
                key={job.id}
                onClick={() => handleJobClick(job)}
                className={`bg-white p-6 rounded-lg border cursor-pointer transition ${
                  selectedJob?.id === job.id
                    ? "border-blue-500 shadow-lg"
                    : "border-gray-200 hover:shadow-md"
                } ${job.highlighted ? "border-l-4 border-l-yellow-400" : ""}`}
              >
                {job.highlighted && (
                  <div className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs mb-3">
                    Empleo destacado
                  </div>
                )}

                {job.matchPercentage && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1 text-green-600 text-sm">
                      <Star className="w-4 h-4 fill-green-600" />
                      <span className="font-semibold">{job.matchPercentage}% compatible</span>
                    </div>
                  </div>
                )}

                <h3 className="text-lg text-gray-900 mb-2 leading-snug">{job.title}</h3>

                <p className="text-gray-600 text-sm mb-1">{job.company}</p>
                <p className="text-gray-600 text-sm mb-3">{job.location}</p>

                <div className="flex items-center gap-1 text-gray-700 text-sm mb-2">
                  <DollarSign className="w-4 h-4" />
                  <span>{job.salary}</span>
                </div>

                <p className="text-gray-500 text-sm mb-3">{job.postedTime}</p>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJobClick(job);
                    }}
                    className="text-sm text-gray-600 hover:text-gray-900"
                  >
                    Vista
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSaveJob(job.id);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-full transition"
                    >
                      <Heart
                        className={`w-5 h-5 ${
                          savedJobs.has(job.id)
                            ? "fill-red-500 text-red-500"
                            : "text-gray-600"
                        }`}
                      />
                    </button>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 hover:bg-gray-100 rounded-full transition"
                    >
                      <Share2 className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 hover:bg-gray-100 rounded-full transition"
                    >
                      <Eye className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Detalle del trabajo */}
          <div className="flex-1 bg-white rounded-lg border border-gray-200 p-8 overflow-y-auto">
            {selectedJob ? (
              <div>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-3xl mb-4 text-gray-900">{selectedJob.title}</h2>
                    <p className="text-lg text-gray-700 mb-2">{selectedJob.company}</p>
                    <div className="flex items-center gap-2 text-gray-600 mb-4">
                      <MapPin className="w-4 h-4" />
                      <span>{selectedJob.location}</span>
                    </div>
                  </div>
                  {selectedJob.matchPercentage && (
                    <div className="px-4 py-2 bg-green-100 text-green-700 rounded-lg flex items-center gap-2">
                      <Star className="w-5 h-5 fill-green-700" />
                      <span className="font-semibold">{selectedJob.matchPercentage}% match</span>
                    </div>
                  )}
                </div>

                <button className="w-full py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-lg mb-6">
                  Aplicar
                </button>

                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-gray-700">
                    <DollarSign className="w-5 h-5" />
                    <div>
                      <span className="block text-sm text-gray-500">Salario</span>
                      <span>{selectedJob.salary}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <Briefcase className="w-5 h-5" />
                    <div>
                      <span className="block text-sm text-gray-500">Tipo de contrato</span>
                      <span>{selectedJob.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <Clock className="w-5 h-5" />
                    <div>
                      <span className="block text-sm text-gray-500">Jornada</span>
                      <span>Tiempo Completo</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700">
                    <Building2 className="w-5 h-5" />
                    <div>
                      <span className="block text-sm text-gray-500">Modalidad</span>
                      <span>{selectedJob.modality}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-xl mb-4 text-gray-900">Descripción del empleo</h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {selectedJob.description}
                  </p>
                </div>

                <div className="mt-8 border-t border-gray-200 pt-6">
                  <h3 className="text-xl mb-4 text-gray-900">¿Por qué este trabajo es para ti?</h3>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-blue-900 leading-relaxed">
                      Tu perfil coincide en{" "}
                      <span className="font-semibold">{selectedJob.matchPercentage}%</span> con
                      esta oferta. Tus habilidades y experiencia se alinean perfectamente con lo
                      que la empresa busca.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Selecciona una oferta para ver los detalles</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
