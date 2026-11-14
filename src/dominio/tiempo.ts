/**
 * Día operativo y horas fijas de ronda.
 * Todo se calcula en la hora de Ecuador (America/Guayaquil, UTC-5, sin horario de verano),
 * sin importar cómo esté configurado el teléfono.
 */

export const DESFASE_MIN = -300; // UTC-5
export const HORAS_FIJAS = [8, 10, 12, 14, 16, 18, 20, 22, 0, 2, 4, 6] as const;
/** El día operativo arranca a las 08:00 y cierra con la toma de las 06:00. El corte está a las 07:00. */
export const HORA_CORTE = 7;
export const VENTANA_MIN_POR_DEFECTO = 50;

export type DiaOperativo = string; // "AAAA-MM-DD"

/** Fecha ficticia cuyos campos UTC son la hora de Ecuador. Solo para leer partes. */
function enEcuador(ms: number): Date {
  return new Date(ms + DESFASE_MIN * 60_000);
}

/** Instante real a partir de una hora de pared ecuatoriana. */
export function instante(anio: number, mes1a12: number, dia: number, hora = 0, minuto = 0): number {
  return Date.UTC(anio, mes1a12 - 1, dia, hora, minuto) - DESFASE_MIN * 60_000;
}

export function partes(ms: number) {
  const d = enEcuador(ms);
  return {
    anio: d.getUTCFullYear(),
    mes: d.getUTCMonth() + 1,
    dia: d.getUTCDate(),
    hora: d.getUTCHours(),
    minuto: d.getUTCMinutes(),
  };
}

const dosDigitos = (n: number) => String(n).padStart(2, "0");

export function aISO(ms: number): DiaOperativo {
  const p = partes(ms);
  return `${p.anio}-${dosDigitos(p.mes)}-${dosDigitos(p.dia)}`;
}

/** Hora de pantalla, 24 h: "14:05" */
export function hhmm(ms: number): string {
  const p = partes(ms);
  return `${dosDigitos(p.hora)}:${dosDigitos(p.minuto)}`;
}

/** Fecha corta de pantalla: "13/11/2026" */
export function fechaCorta(ms: number): string {
  const p = partes(ms);
  return `${dosDigitos(p.dia)}/${dosDigitos(p.mes)}/${p.anio}`;
}

/** Hora como la escribe el formato oficial: "8:00 a. m." */
export function horaFormato(hora24: number): string {
  const sufijo = hora24 < 12 ? "a. m." : "p. m.";
  const h = hora24 % 12 === 0 ? 12 : hora24 % 12;
  return `${h}:00 ${sufijo}`;
}

/** A qué día operativo pertenece un instante. Antes de las 07:00 es del día anterior. */
export function diaOperativo(ms: number): DiaOperativo {
  const p = partes(ms);
  if (p.hora >= HORA_CORTE) return aISO(ms);
  return aISO(ms - 24 * 3600_000);
}

function desdeISO(dia: DiaOperativo): [number, number, number] {
  const [a, m, d] = dia.split("-").map(Number) as [number, number, number];
  return [a, m, d];
}

/** Los 12 instantes de las horas fijas de un día operativo, en el orden del formato. */
export function ranurasDelDia(dia: DiaOperativo): number[] {
  const [a, m, d] = desdeISO(dia);
  return HORAS_FIJAS.map((h, i) => instante(a, m, d + (i >= 8 ? 1 : 0), h));
}

export type Asignacion = {
  dia: DiaOperativo;
  indice: number; // 0..11 dentro de HORAS_FIJAS
  horaFija: number; // 0..23
  desfaseMin: number; // minutos de diferencia con la hora fija (positivo = después)
  atrasada: boolean;
};

/** A qué hora fija corresponde una lectura tomada en `ms`. */
export function asignarLectura(ms: number, ventanaMin = VENTANA_MIN_POR_DEFECTO): Asignacion {
  // Se prueba el día operativo propio y el vecino: una toma a las 23:50 cae en la ranura de las 00:00.
  const candidatos: DiaOperativo[] = [diaOperativo(ms)];
  const otro = diaOperativo(ms + 2 * 3600_000);
  if (otro !== candidatos[0]) candidatos.push(otro);

  let mejor: Asignacion | null = null;
  for (const dia of candidatos) {
    ranurasDelDia(dia).forEach((ranura, indice) => {
      const desfaseMin = Math.round((ms - ranura) / 60_000);
      if (!mejor || Math.abs(desfaseMin) < Math.abs(mejor.desfaseMin)) {
        mejor = {
          dia,
          indice,
          horaFija: HORAS_FIJAS[indice]!,
          desfaseMin,
          atrasada: Math.abs(desfaseMin) > ventanaMin,
        };
      }
    });
  }
  return mejor!;
}

/** "2 d 6 h" / "14 h 20 min" */
export function duracion(desdeMs: number, hastaMs: number): string {
  const min = Math.max(0, Math.round((hastaMs - desdeMs) / 60_000));
  const dias = Math.floor(min / 1440);
  const horas = Math.floor((min % 1440) / 60);
  const mins = min % 60;
  if (dias > 0) return `${dias} d ${horas} h`;
  if (horas > 0) return `${horas} h ${mins} min`;
  return `${mins} min`;
}

/**
 * A qué ranura se GUARDA una lectura suelta (una llegada, por ejemplo).
 * Se parece a `asignarLectura`, con una regla de más: nunca se guarda en una hora
 * fija que todavía no ha llegado, porque no se puede reportar una ronda que no empezó.
 * Las lecturas de una ronda no pasan por aquí: usan la ronda que el patero tiene abierta.
 */
export function ranuraParaGuardar(ms: number, ventanaMin = VENTANA_MIN_POR_DEFECTO): Asignacion {
  const a = asignarLectura(ms, ventanaMin);
  const suya = ranurasDelDia(a.dia)[a.indice]!;
  if (suya <= ms) return a;

  // la más cercana todavía no ha llegado: se usa la última que sí pasó
  for (let saltoDias = 0; saltoDias < 2; saltoDias++) {
    const dia = diaOperativo(ms - saltoDias * 86_400_000);
    const ranuras = ranurasDelDia(dia);
    for (let i = ranuras.length - 1; i >= 0; i--) {
      if (ranuras[i]! <= ms) {
        const desfaseMin = Math.round((ms - ranuras[i]!) / 60_000);
        return { dia, indice: i, horaFija: HORAS_FIJAS[i]!, desfaseMin, atrasada: Math.abs(desfaseMin) > ventanaMin };
      }
    }
  }
  return a;
}
