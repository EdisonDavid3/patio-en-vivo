import { useEffect, useState } from "react";
import type { EstadoPosicion } from "../datos/tipos";
import { rango, formatearC, type Rango } from "../dominio/temperatura";

export type Clase = "libre" | "codigo" | Rango;

export function claseDe(e: EstadoPosicion): Clase {
  if (!e.estadia) return "libre";
  if (e.estadia.suspendido) return "codigo";
  const l = e.ultima;
  if (!l) return "codigo";
  if (l.c === null) return "codigo";
  return rango(l.c);
}

export const ETIQUETA_CLASE: Record<Clase, string> = {
  libre: "Libre", correcto: "Correcto", urgencia: "Urgencia", alerta: "Alerta", codigo: "Sin lectura",
};
export const ICONO_CLASE: Record<Clase, string> = {
  libre: "", correcto: "✓", urgencia: "!", alerta: "▲", codigo: "•",
};

export function valorDe(e: EstadoPosicion): string {
  if (!e.estadia) return "";
  if (e.estadia.suspendido) return e.estadia.suspendido;
  const l = e.ultima;
  if (!l) return "—";
  if (l.c === null) return l.codigo ?? "—";
  return formatearC(l.c) + " °C";
}

export function useAncho(min = 1024): boolean {
  const [ancho, setAncho] = useState(() => globalThis.matchMedia?.(`(min-width:${min}px)`).matches ?? false);
  useEffect(() => {
    const mq = globalThis.matchMedia(`(min-width:${min}px)`);
    const f = () => setAncho(mq.matches);
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, [min]);
  return ancho;
}

export type Tema = "claro" | "oscuro";
export function useTema(): [Tema, () => void] {
  const [tema, setTema] = useState<Tema>(() => {
    try {
      const g = localStorage.getItem("ts-tema") as Tema | null;
      if (g) return g;
    } catch { /* almacenamiento bloqueado */ }
    return globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
  });
  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    try { localStorage.setItem("ts-tema", tema); } catch { /* da igual */ }
  }, [tema]);
  return [tema, () => setTema((t) => (t === "claro" ? "oscuro" : "claro"))];
}

/** Texto que escribe el patero -> número. El signo menos viene puesto por defecto. */
export function aNumero(texto: string, negativo: boolean): number | null {
  if (!texto) return null;
  const n = Number(texto.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return negativo ? -Math.abs(n) : Math.abs(n);
}

export function mostrarValor(texto: string, negativo: boolean): string {
  if (!texto) return negativo ? "−" : "+";
  return (negativo ? "−" : "+") + texto;
}
