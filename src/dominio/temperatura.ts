/** Reglas de temperatura. Configurables: los límites viven en `config`, no en el código. */

export type Rango = "correcto" | "urgencia" | "alerta";

export type LimitesTemp = { correctoHasta: number; urgenciaHasta: number };
export const LIMITES_POR_DEFECTO: LimitesTemp = { correctoHasta: -18, urgenciaHasta: -15 };

/** D13: el tramo entre -18 y -15 se llama "urgencia", no "aceptable". */
export function rango(c: number, lim: LimitesTemp = LIMITES_POR_DEFECTO): Rango {
  if (c <= lim.correctoHasta) return "correcto";
  if (c <= lim.urgenciaHasta) return "urgencia";
  return "alerta";
}

export const ETIQUETA: Record<Rango, string> = {
  correcto: "Correcto",
  urgencia: "Urgencia",
  alerta: "Alerta",
};
export const ICONO: Record<Rango, string> = { correcto: "✓", urgencia: "!", alerta: "▲" };

/** Códigos del formato oficial para cuando no se puede tomar la lectura (D3). */
export const CODIGOS = [
  { codigo: "C", nombre: "Cargando" },
  { codigo: "D", nombre: "Despachado" },
  { codigo: "E", nombre: "En espera" },
  { codigo: "SE", nombre: "Sin energía" },
  { codigo: "V", nombre: "Vacío" },
] as const;
export type Codigo = (typeof CODIGOS)[number]["codigo"];

/** Valores que piden confirmación por improbables. */
export function esImprobable(c: number): boolean {
  return c > 5 || c < -40;
}

/** Texto en pantalla: -18.4 con el menos tipográfico. */
export function formatearC(c: number): string {
  const s = Math.abs(c).toFixed(1);
  return (c < 0 ? "−" : "") + s;
}
