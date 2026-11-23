/**
 * Quién puede hacer qué. Una sola tabla, un solo lugar.
 *
 * OJO: en la Fase 0 esto decide lo que se ve y lo que se puede tocar, pero NO es
 * seguridad: no hay servidor que lo verifique y cualquiera podría crearse un
 * usuario administrador en su propio teléfono. El candado real llega en la Fase 1,
 * con activación del equipo y comprobación en el servidor (D8).
 */
export type Rol = "administrador" | "patero" | "visualizador";

export type Accion =
  | "ver"              // plano, listas, fichas, reportes
  | "registrarLlegada"
  | "medir"            // ronda y tomar temperatura
  | "mover"
  | "salida"
  | "corregir"
  | "verificarTurno"
  | "arrastrar"        // mover arrastrando en el plano de PC
  | "usuarios"         // crear, editar y desactivar usuarios
  | "ajustes";

const TABLA: Record<Rol, Accion[]> = {
  administrador: ["ver", "registrarLlegada", "medir", "mover", "salida", "corregir",
                  "verificarTurno", "arrastrar", "usuarios", "ajustes"],
  patero: ["ver", "registrarLlegada", "medir", "mover", "salida", "corregir", "verificarTurno"],
  visualizador: ["ver"],
};

export const TABLA_PRUEBA: Accion[] = ["ver","registrarLlegada","medir","mover","salida","corregir","verificarTurno","arrastrar","usuarios","ajustes"];

export const ROLES: Rol[] = ["administrador", "patero", "visualizador"];

export const NOMBRE_ROL: Record<Rol, string> = {
  administrador: "Administrador",
  patero: "Patero",
  visualizador: "Visualizador",
};

export const QUE_HACE: Record<Rol, string> = {
  administrador: "Acceso completo: ajustes, usuarios, historial y todo lo del patero.",
  patero: "Registra llegadas, toma temperaturas, mueve y da salida a contenedores.",
  visualizador: "Solo consulta: el plano, las listas, las fichas y los reportes.",
};

export function puede(rol: Rol, accion: Accion): boolean {
  return TABLA[rol].includes(accion);
}

/** Al administrador se le pide el PIN siempre, aunque el equipo recuerde la sesión. */
export function pinSiempre(rol: Rol): boolean {
  return rol === "administrador";
}

/** Largo del PIN según el rol. El administrador lleva uno más largo. */
export function largoPin(rol: Rol): number {
  return rol === "administrador" ? 6 : 4;
}
