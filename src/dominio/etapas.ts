/**
 * Etapas por las que pasa un contenedor en el patio.
 *
 * El recorrido real:
 *   llega vacío → se enciende y se enfría EN EL SECTOR → pasa a Cámara 3 y 4 a cargar
 *   → vuelve a un sector con producto y espera el envío → sale.
 *
 * Cámara 1 y 2 (posiciones 1 a 5) NO es cámara de carga: es una zona normal.
 * La única cámara de carga es Cámara 3 y 4 (posiciones 6 a 11).
 */
import type { Codigo } from "./temperatura";

export type Etapa = "vacio" | "enfriando" | "cargando" | "con_producto" | "despachado";

export type ReglaEtapa = {
  nombre: string;
  corto: string;
  descripcion: string;
  /** ¿Se le toma temperatura? */
  mide: boolean;
  /** ¿Aplican las reglas de −18 / −15 con alertas? */
  alerta: boolean;
  /** ¿Entra en la ronda y cuenta como «sin tomar»? */
  enRonda: boolean;
  /** Letra del formato oficial. `null` = la norma no tiene código para esta etapa. */
  codigoOficial: Codigo | null;
};

/** Valores por defecto. El supervisor los puede cambiar; viven en `config`, no en el código. */
export const ETAPAS: Record<Etapa, ReglaEtapa> = {
  vacio: {
    nombre: "Vacío", corto: "Vacío",
    descripcion: "Llegó vacío y está ubicado. Todavía no se enciende.",
    mide: false, alerta: false, enRonda: false, codigoOficial: "V",
  },
  enfriando: {
    nombre: "Enfriando", corto: "Enfriando",
    descripcion: "Vacío y encendido, bajando temperatura en el sector antes de pasar a cámara.",
    mide: true, alerta: false, enRonda: true, codigoOficial: null,
  },
  cargando: {
    nombre: "Cargando", corto: "Cargando",
    descripcion: "En Cámara 3 y 4, recibiendo producto.",
    mide: true, alerta: false, enRonda: true, codigoOficial: "C",
  },
  con_producto: {
    nombre: "Con producto, en espera", corto: "En espera",
    descripcion: "Ya cargado, esperando la hora de envío. Aquí se vigila la temperatura.",
    mide: true, alerta: true, enRonda: true, codigoOficial: "E",
  },
  despachado: {
    nombre: "Despachado", corto: "Despachado",
    descripcion: "Salió del patio.",
    mide: false, alerta: false, enRonda: false, codigoOficial: "D",
  },
};

export const ORDEN_ETAPAS: Etapa[] = ["vacio", "enfriando", "cargando", "con_producto", "despachado"];

export const exigeTemperatura = (e: Etapa) => ETAPAS[e].mide;
export const vigilada = (e: Etapa) => ETAPAS[e].alerta;
export const entraEnRonda = (e: Etapa) => ETAPAS[e].enRonda;

/** Temperatura a la que el contenedor ya se puede cargar. Configurable. */
export const IDEAL_PARA_CARGAR = -18;

export function listoParaCargar(ultimaC: number | null, ideal = IDEAL_PARA_CARGAR): boolean {
  return ultimaC !== null && ultimaC <= ideal;
}

/** Cuánto le falta para poder cargar. `null` si ya llegó o no hay lectura. */
export function faltaParaCargar(ultimaC: number | null, ideal = IDEAL_PARA_CARGAR): number | null {
  if (ultimaC === null || ultimaC <= ideal) return null;
  return Math.round((ultimaC - ideal) * 10) / 10;
}

/** Qué etapas puede elegir el patero desde una etapa dada. */
export function siguientes(e: Etapa): Etapa[] {
  switch (e) {
    case "vacio": return ["enfriando"];
    case "enfriando": return ["cargando", "vacio"];
    case "cargando": return ["con_producto", "enfriando"];
    case "con_producto": return ["despachado"];
    default: return [];
  }
}
