import { describe, it, expect } from "vitest";
import { puede, pinSiempre, largoPin, ROLES, TABLA_PRUEBA } from "./permisos";

describe("permisos por rol", () => {
  it("el visualizador solo mira", () => {
    expect(puede("visualizador", "ver")).toBe(true);
    for (const a of ["registrarLlegada", "medir", "mover", "salida", "corregir",
                     "verificarTurno", "arrastrar", "usuarios", "ajustes"] as const) {
      expect(puede("visualizador", a)).toBe(false);
    }
  });

  it("el patero trabaja el patio pero no toca usuarios ni ajustes", () => {
    for (const a of ["ver", "registrarLlegada", "medir", "mover", "salida", "corregir", "verificarTurno"] as const) {
      expect(puede("patero", a)).toBe(true);
    }
    expect(puede("patero", "usuarios")).toBe(false);
    expect(puede("patero", "ajustes")).toBe(false);
  });

  it("arrastrar en el plano es solo del administrador; los demás usan el botón Mover", () => {
    expect(puede("administrador", "arrastrar")).toBe(true);
    expect(puede("patero", "arrastrar")).toBe(false);
    expect(puede("patero", "mover")).toBe(true);
    expect(puede("visualizador", "arrastrar")).toBe(false);
  });

  it("el administrador puede todo", () => {
    for (const r of ROLES) {
      if (r !== "administrador") continue;
      for (const a of TABLA_PRUEBA) expect(puede(r, a)).toBe(true);
    }
  });

  it("al administrador se le pide el PIN siempre, y lo tiene más largo", () => {
    expect(pinSiempre("administrador")).toBe(true);
    expect(pinSiempre("patero")).toBe(false);
    expect(pinSiempre("visualizador")).toBe(false);
    expect(largoPin("administrador")).toBe(6);
    expect(largoPin("patero")).toBe(4);
    expect(largoPin("visualizador")).toBe(4);
  });
});
