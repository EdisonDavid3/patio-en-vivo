import type { Codigo } from "./temperatura";

/** Una celda del reporte: o un número, o un código, o nada. */
export type Celda = { c: number } | { codigo: Codigo } | null;

export const esNumero = (x: Celda): x is { c: number } => x !== null && "c" in x;

/** D3: el mínimo, el máximo y el promedio solo cuentan lecturas numéricas. */
export function resumen(celdas: readonly Celda[]): { min: number; max: number; prom: number } | null {
  const v = celdas.filter(esNumero).map((x) => x.c);
  if (v.length === 0) return null;
  const suma = v.reduce((a, b) => a + b, 0);
  return {
    min: Math.min(...v),
    max: Math.max(...v),
    prom: Math.round((suma / v.length) * 10) / 10,
  };
}

/** Tramo de una estadía en una posición. */
export type Tramo = { posicionId: string; desde: number; hasta: number | null };

/**
 * Tiempo total en patio. Mover de posición NO lo reinicia: se cuenta desde la
 * entrada hasta la salida (o hasta ahora), sin importar cuántas veces se movió.
 */
export function tiempoEnPatio(entrada: number, salida: number | null, ahora: number): number {
  return Math.max(0, (salida ?? ahora) - entrada);
}

/** Las posiciones por las que pasó, en orden. */
export function recorrido(tramos: readonly Tramo[]): string[] {
  return [...tramos].sort((a, b) => a.desde - b.desde).map((t) => t.posicionId);
}
