import { Sparkles, Zap, Target, Check, Clock, Brain, FileText, ArrowRight, Star } from "lucide-react";
import { Link } from "react-router";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navegación */}
      <nav className="px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <FileText className="w-8 h-8 text-blue-600" />
          <span className="text-2xl text-gray-900">AutoCV</span>
        </div>
        <div className="flex items-center gap-5">
          <Link
            to="/jobs"
            className="text-gray-700 hover:text-blue-600 transition"
          >
            Empleos
          </Link>
          <Link
            to="/contact"
            className="text-gray-700 hover:text-blue-600 transition"
          >
            Contactanos
          </Link>
          <Link
            to="/create"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Crear CV Gratis
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm">Potenciado por IA</span>
            </div>
            <h1 className="text-5xl mb-6 text-gray-900 leading-tight">
              Crea tu CV perfecto en{" "}
              <span className="text-blue-600">menos de 15 minutos</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Nuestra inteligencia artificial te ayuda a crear un currículum profesional
              que destaca. Sin diseño complicado, sin pérdida de tiempo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/create"
                className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 text-lg"
              >
                Empezar Ahora
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/jobs"
                className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-blue-600 hover:text-blue-600 transition text-lg"
              >
                Ver Ofertas
              </Link>
            </div>
            <div className="flex items-center gap-6 mt-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span>100% Gratis</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span>Sin registro</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                <span>Descarga PDF</span>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-3xl blur-3xl opacity-20"></div>
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1554224155-cfa08c2a758f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjByZXN1bWUlMjBkb2N1bWVudCUyMGRlc2t8ZW58MXx8fHwxNzcxOTI1OTM3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
              alt="CV Profesional"
              className="relative rounded-2xl shadow-2xl w-full"
            />
          </div>
        </div>
      </section>

      {/* Características principales */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl mb-4 text-gray-900">¿Por qué AutoCV?</h2>
            <p className="text-xl text-gray-600">
              La forma más rápida y efectiva de crear tu hoja de vida profesional
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl">
              <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl mb-3 text-gray-900">Súper Rápido</h3>
              <p className="text-gray-600 leading-relaxed">
                En menos de 15 minutos tendrás tu CV completo y listo para descargar.
                Sin complicaciones, sin perder tiempo.
              </p>
            </div>
            <div className="p-8 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl">
              <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center mb-6">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl mb-3 text-gray-900">IA Inteligente</h3>
              <p className="text-gray-600 leading-relaxed">
                Nuestra IA te sugiere mejoras, optimiza tu contenido y asegura que tu CV
                destaque ante reclutadores.
              </p>
            </div>
            <div className="p-8 bg-gradient-to-br from-green-50 to-green-100 rounded-2xl">
              <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl mb-3 text-gray-900">Resultados Profesionales</h3>
              <p className="text-gray-600 leading-relaxed">
                Diseños modernos y profesionales que impresionan. Optimizados para sistemas
                ATS de reclutamiento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl mb-4 text-gray-900">Sólo 3 pasos simples</h2>
          <p className="text-xl text-gray-600">
            Tu CV profesional está a solo minutos de distancia
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl mx-auto mb-6">
              1
            </div>
            <h3 className="text-xl mb-3 text-gray-900">Ingresa tu información</h3>
            <p className="text-gray-600">
              Completa el formulario simple con tus datos profesionales, experiencia y
              habilidades.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl mx-auto mb-6">
              2
            </div>
            <h3 className="text-xl mb-3 text-gray-900">La IA lo optimiza</h3>
            <p className="text-gray-600">
              Nuestra inteligencia artificial mejora tu contenido y aplica un diseño
              profesional automáticamente.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl mx-auto mb-6">
              3
            </div>
            <h3 className="text-xl mb-3 text-gray-900">Descarga y aplica</h3>
            <p className="text-gray-600">
              Descarga tu CV en PDF de alta calidad y empieza a enviar solicitudes de
              empleo de inmediato.
            </p>
          </div>
        </div>
      </section>

      {/* SEO: cómo hacer hoja de vida */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl mb-4 text-gray-900">Cómo hacer una hoja de vida efectiva</h2>
            <p className="text-xl text-gray-600">
              Estructura recomendada para crear una hoja de vida profesional que atraiga
              reclutadores.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <article className="p-8 border border-gray-200 rounded-2xl bg-gray-50">
              <h3 className="text-2xl mb-3 text-gray-900">Perfil profesional claro</h3>
              <p className="text-gray-600 leading-relaxed">
                Resume en 3 o 4 lineas tu experiencia, fortalezas y valor principal para
                el cargo al que aplicas.
              </p>
            </article>
            <article className="p-8 border border-gray-200 rounded-2xl bg-gray-50">
              <h3 className="text-2xl mb-3 text-gray-900">Logros con resultados</h3>
              <p className="text-gray-600 leading-relaxed">
                Describe logros concretos con datos: porcentajes, tiempos o impacto para
                demostrar resultados reales.
              </p>
            </article>
            <article className="p-8 border border-gray-200 rounded-2xl bg-gray-50">
              <h3 className="text-2xl mb-3 text-gray-900">Formato ATS-friendly</h3>
              <p className="text-gray-600 leading-relaxed">
                Usa una plantilla de CV limpia, titulos claros y palabras clave del puesto
                para superar filtros automatizados.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* SEO: plantillas y ejemplos */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl mb-4 text-gray-900">Plantillas de CV y ejemplos de CV</h2>
          <p className="text-xl text-gray-600">
            Elige plantillas modernas y adapta ejemplos de CV para crear un currículum
            competitivo en minutos.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <article className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100">
            <h3 className="text-2xl mb-3 text-gray-900">Plantillas de CV modernas</h3>
            <p className="text-gray-600 leading-relaxed">
              Diseños limpios para perfiles junior, senior y ejecutivos. Preparados para
              descarga en PDF.
            </p>
          </article>
          <article className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-white border border-purple-100">
            <h3 className="text-2xl mb-3 text-gray-900">Ejemplos de CV por profesión</h3>
            <p className="text-gray-600 leading-relaxed">
              Inspírate con ejemplos de CV para marketing, tecnologia, ventas y areas
              administrativas.
            </p>
          </article>
          <article className="p-6 rounded-2xl bg-gradient-to-br from-green-50 to-white border border-green-100">
            <h3 className="text-2xl mb-3 text-gray-900">Currículum listo para postular</h3>
            <p className="text-gray-600 leading-relaxed">
              Optimiza tu contenido con IA y genera un CV profesional para aplicar en
              portales de empleo y LinkedIn.
            </p>
          </article>
        </div>
      </section>

      {/* Estadísticas */}
      <section className="px-6 py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-5xl mb-2">500K+</div>
              <p className="text-blue-100 text-lg">CVs Creados</p>
            </div>
            <div>
              <div className="text-5xl mb-2">15min</div>
              <p className="text-blue-100 text-lg">Tiempo Promedio</p>
            </div>
            <div>
              <div className="text-5xl mb-2">95%</div>
              <p className="text-blue-100 text-lg">Satisfacción</p>
            </div>
            <div>
              <div className="text-5xl mb-2">24/7</div>
              <p className="text-blue-100 text-lg">Disponibilidad</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl mb-4 text-gray-900">Lo que dicen nuestros usuarios</h2>
          <p className="text-xl text-gray-600">
            Miles de personas ya consiguieron su trabajo ideal
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-gray-700 mb-4 leading-relaxed">
              "Increíble! En 10 minutos tenía mi CV listo. La IA realmente ayuda a mejorar
              la redacción. Conseguí entrevistas en una semana."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center text-blue-700">
                MC
              </div>
              <div>
                <div className="text-gray-900">María Castro</div>
                <div className="text-sm text-gray-500">Marketing Manager</div>
              </div>
            </div>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-gray-700 mb-4 leading-relaxed">
              "La mejor herramienta de CV que he usado. Súper fácil, rápida y el resultado
              es muy profesional. Totalmente recomendado."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center text-purple-700">
                JR
              </div>
              <div>
                <div className="text-gray-900">Juan Rodríguez</div>
                <div className="text-sm text-gray-500">Software Developer</div>
              </div>
            </div>
          </div>
          <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="flex gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <p className="text-gray-700 mb-4 leading-relaxed">
              "Me encantó lo rápido que es. No necesitas ser diseñador para tener un CV
              que se vea increíble. Perfecto para profesionales ocupados."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center text-green-700">
                AS
              </div>
              <div>
                <div className="text-gray-900">Ana Sánchez</div>
                <div className="text-sm text-gray-500">Project Manager</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="px-6 py-20 bg-gradient-to-br from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-5xl mb-6">¿Listo para destacar?</h2>
          <p className="text-2xl mb-8 text-blue-100">
            Únete a miles de profesionales que ya crearon su CV perfecto
          </p>
          <Link
            to="/create"
            className="inline-flex items-center gap-3 px-10 py-5 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition text-xl shadow-2xl"
          >
            <Clock className="w-6 h-6" />
            Crear mi CV en 15 minutos
            <ArrowRight className="w-6 h-6" />
          </Link>
          <p className="mt-6 text-blue-100">
            No se requiere tarjeta de crédito • 100% Gratis • Sin compromisos
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <FileText className="w-6 h-6 text-blue-400" />
            <span className="text-xl text-white">AutoCV</span>
          </div>
          <p className="mb-4">
            La forma más rápida de crear tu currículum profesional con inteligencia
            artificial
          </p>
          <p className="mb-4">
            Proyecto univeritario creado por Diego Rodriguez para ETITC
          </p>
          <div className="flex justify-center gap-6 text-sm">
            <a href="#" className="hover:text-white transition">
              Términos
            </a>
            <a href="#" className="hover:text-white transition">
              Privacidad
            </a>
            <Link to="/contact" className="hover:text-white transition">
              Contacto
            </Link>
          </div>
          <p className="mt-6 text-sm">© 2026 AutoCV. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}