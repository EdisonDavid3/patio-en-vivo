import type { Codigo } from "../dominio/temperatura";

export type Rol = "patero" | "supervisor";

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
  nota: string;
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
};
