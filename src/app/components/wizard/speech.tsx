import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Square, Volume2 } from "lucide-react";

type RecognitionCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> & { length: number } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

/** Lee en voz alta el contenido de un contenedor (título, instrucciones y errores del paso). */
export function ReadAloudButton({ targetId }: { targetId: string }) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => {
    if (canSpeak()) window.speechSynthesis.cancel();
  }, []);

  if (!canSpeak()) return null;

  const toggle = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const root = document.getElementById(targetId);
    const parts = root ? [...root.querySelectorAll("[data-read]")].map((node) => node.textContent ?? "") : [];
    const utterance = new SpeechSynthesisUtterance(parts.join(". ") || root?.textContent || "");
    utterance.lang = "es-CO";
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={speaking}
      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-gray-500 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
    >
      {speaking ? <Square className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
      {speaking ? "Detener lectura" : "Escuchar este paso"}
    </button>
  );
}

/** Dictado por voz para textos largos. No se muestra si el navegador no lo soporta. */
export function DictationButton({ onText, label }: { onText: (text: string) => void; label: string }) {
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState("");
  const recognitionRef = useRef<InstanceType<RecognitionCtor> | null>(null);
  const Ctor = typeof window !== "undefined" ? recognitionCtor() : null;

  useEffect(() => () => recognitionRef.current?.stop(), []);

  if (!Ctor) return null;

  const toggle = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "es-CO";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      const text = last?.[0]?.transcript?.trim();
      if (text) onText(text);
    };
    recognition.onend = () => {
      setListening(false);
      setStatus("Dictado detenido.");
    };
    recognition.onerror = () => {
      setListening(false);
      setStatus("No se pudo usar el micrófono. Revisa el permiso del navegador.");
    };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setStatus("Escuchando. Habla y pulsa de nuevo para detener.");
  };

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={listening}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-gray-500 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100"
      >
        {listening ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
        {listening ? "Detener dictado" : `Dictar ${label}`}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>
    </>
  );
}
