import { FileText, Mail, MessageSquare, ArrowLeft } from "lucide-react";
import { Link } from "react-router";

export function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <header className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-7 h-7 text-blue-600" />
          <span className="text-2xl">AutoCV</span>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        <h1 className="text-4xl mb-4">Contactanos</h1>
        <p className="text-lg text-slate-600 max-w-3xl mb-10">
          Si necesitas ayuda para crear tu CV o quieres enviar sugerencias para mejorar la
          plataforma, este es nuestro canal de contacto.
        </p>

        <section className="grid md:grid-cols-2 gap-6">
          <article className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <h2 className="text-2xl mb-2">Soporte</h2>
            <p className="text-slate-600 mb-4">Escribenos para dudas tecnicas o de uso.</p>
            <a
              href="mailto:soporte@autocv.me"
              className="text-blue-700 hover:text-blue-800 underline"
            >
              soporte@autocv.me
            </a>
          </article>

          <article className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h2 className="text-2xl mb-2">Alianzas y feedback</h2>
            <p className="text-slate-600 mb-4">
              Compartamos ideas para potenciar oportunidades laborales de tus usuarios.
            </p>
            <a
              href="mailto:hola@autocv.me"
              className="text-emerald-700 hover:text-emerald-800 underline"
            >
              hola@autocv.me
            </a>
          </article>
        </section>
      </main>
    </div>
  );
}
