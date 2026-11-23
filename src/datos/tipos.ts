import type { Codigo } from "../dominio/temperatura";
import type { Etapa } from "../dominio/etapas";

export type { Rol } from "../dominio/permisos";
import type { Rol } from "../dominio/permisos";

export type Zona = {
  id: string;
  nombre: string;      // "Sector C"
  cap: string;         // "SECTOR C" (como el papel)
  desde: number;       // primer número de posición
  hasta: number;       // último número
  orden: number;
  colsTel: number;     // columnitas en el mini-plano del teléfono
  grupo: number;       // columna del plano, igual que la hoja
  activa: boolean;
};

export type Posicion = { id: string; zonaId: string; numero: number; orden: number; activa: boolean };

export type Contenedor = { numero: string; prefijo: string; extra: Record<string, unknown> };

export type Estadia = {
  id: string;
  numero: string;
  entrada: number;
  salida: number | null;
  producto: string;
  sello: string;
  estado: string;
  /** D2: quedó guardado con advertencia porque el dígito verificador no cuadraba. */
  conAdvertencia: boolean;
  /** D3: el supervisor lo marcó sin energía o vacío; deja de pedirle temperatura. */
  suspendido: Codigo | null;
  /** D25: en qué etapa del recorrido está. Decide si se mide y si aplican alertas. */
  etapa: Etapa;
  nota: string;
};

/** Cuánto tiempo estuvo la estadía en cada etapa. Alimenta el reporte de tiempo en patio. */
export type TramoEtapa = {
  id: string;
  estadiaId: string;
  etapa: Etapa;
  desde: number;
  hasta: number | null;
  usuarioId: string;
};

export type Ubicacion = { id: string; estadiaId: string; posicionId: string; desde: number; hasta: number | null };

export type Lectura = {
  id: string;
  estadiaId: string;
  posicionId: string;
  numero: string;
  tomadaMs: number;
  dia: string;
  indice: number;
  horaFija: number;
  c: number | null;
  codigo: Codigo | null;
  atrasada: boolean;
  usuarioId: string;
  nota: string;
};

export type Usuario = {
  id: string;
  nombre: string;
  rol: Rol;
  /** D17: el orden de secciones que suele seguir en la ronda. */
  ordenSecciones: string[];
  activo: boolean;
  /** PIN guardado como huella, nunca en claro. No es seguridad real hasta la Fase 1. */
  sal: string;
  huellaPin: string;
  creadoMs: number;
};

/** D48: verificación de turno, una vez por turno y por sección. */
export type Verificacion = {
  id: string;
  dia: string;
  turno: "dia" | "noche";
  zonaId: string;
  usuarioId: string;
  ms: number;
  correcciones: number;
};

/** Registro que solo agrega: quién hizo qué y cuándo. Base de la sincronización futura. */
export type Evento = {
  id: string;
  tipo: string;
  carga: unknown;
  usuarioId: string;
  dispositivoId: string;
  creadoMs: number;
  enviadoMs: number | null;
};

export type Ajuste = { clave: string; valor: unknown };

/** Lo que la pantalla necesita saber de una posición. */
export type EstadoPosicion = {
  posicion: Posicion;
  zona: Zona;
  estadia: Estadia | null;
  ultima: Lectura | null;
  anterior: Lectura | null;
  medidaEnRonda: boolean;
  /** Etapa de la estadía que ocupa la posición, o null si está libre. */
  etapa: Etapa | null;
  /** ¿Esta posición entra en la ronda y cuenta como «sin tomar»? */
  cuentaEnRonda: boolean;
};
