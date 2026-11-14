import type { Zona, Posicion } from "./tipos";

/**
 * Las 115 posiciones, tal como están en la hoja de patio.
 * `grupo` es la columna del plano; dentro de un grupo las zonas van una debajo de otra.
 * `colsTel` / `colsPC` reparten las zonas largas en columnitas para que la hoja quepa
 * en la pantalla sin perder el orden de arriba hacia abajo.
 */
export const ZONAS: Zona[] = [
  { id: "E1", nombre: "Cámara 1 y 2", cap: "CAMARA 1 Y 2", desde: 1, hasta: 5,  orden: 0, colsTel: 3, grupo: 0, activa: true },
  { id: "E2", nombre: "Cámara 3 y 4", cap: "CAMARA 3 Y 4", desde: 6, hasta: 11, orden: 1, colsTel: 3, grupo: 0, activa: true },
  { id: "C",  nombre: "Sector C",     cap: "SECTOR C",     desde: 1, hasta: 22, orden: 2, colsTel: 5, grupo: 1, activa: true },
  { id: "B",  nombre: "Sector B",     cap: "SECTOR B",     desde: 1, hasta: 20, orden: 3, colsTel: 5, grupo: 2, activa: true },
  { id: "OF", nombre: "Oficina",      cap: "OFICINA",      desde: 1, hasta: 6,  orden: 4, colsTel: 6, grupo: 2, activa: true },
  { id: "A",  nombre: "Sector A",     cap: "SECTOR A",     desde: 1, hasta: 32, orden: 5, colsTel: 6, grupo: 3, activa: true },
  { id: "PN", nombre: "Patio Nuevo",  cap: "PATIO NUEVO",  desde: 1, hasta: 24, orden: 6, colsTel: 5, grupo: 4, activa: true },
];

/** Columnas de cada zona en el plano completo de PC. */
export const COLS_PC: Record<string, number> = { E1: 1, E2: 1, C: 1, B: 2, OF: 1, A: 2, PN: 1 };

export const GRUPOS = [0, 1, 2, 3, 4];

export function posicionesDe(z: Zona): Posicion[] {
  const out: Posicion[] = [];
  for (let n = z.desde; n <= z.hasta; n++) {
    out.push({ id: `${z.id}-${n}`, zonaId: z.id, numero: n, orden: n, activa: true });
  }
  return out;
}

export const TODAS_POSICIONES: Posicion[] = ZONAS.flatMap(posicionesDe);

/** "C 9" — como se nombra en el papel. */
export function etiquetaPosicion(id: string): string {
  return id.replace("-", " ");
}
