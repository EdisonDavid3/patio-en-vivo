import { describe, it, expect } from "vitest";
import { digitoVerificador, validar, formatear, normalizar } from "./iso6346";

describe("ISO 6346", () => {
  it("calcula el dígito verificador de números conocidos", () => {
    expect(digitoVerificador("MSCU128160")).toBe(8);
    expect(digitoVerificador("TGHU734001")).toBe(5);
    expect(digitoVerificador("CMAU485090")).toBe(1);
    expect(digitoVerificador("CSQU305438")).toBe(3); // ejemplo de la norma
  });

  it("acepta un número correcto", () => {
    const r = validar("mscu 1281608");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.numero).toBe("MSCU1281608");
  });

  it("rechaza por formato cuando faltan caracteres (D1: completo sin excusas)", () => {
    for (const malo of ["8160", "MSCU128160", "MSC1281608", "MSCU12816081", "1281608MSCU"]) {
      const r = validar(malo);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.motivo).toBe("formato");
    }
  });

  it("avisa del dígito verificador y dice cuál debería ser (D2: botón rojo)", () => {
    const r = validar("MSCU1281601");
    expect(r.ok).toBe(false);
    if (!r.ok && r.motivo === "verificador") {
      expect(r.esperado).toBe(8);
      expect(r.numero).toBe("MSCU1281601");
      expect(r.mensaje).toContain("8");
    } else {
      throw new Error("se esperaba un fallo de verificador");
    }
  });

  it("el dígito verificador nunca es 10", () => {
    // El resto 10 se escribe como 0 según la norma.
    let visto0 = false;
    for (let i = 100000; i < 100400; i++) {
      const d = digitoVerificador("MSCU" + String(i).padStart(6, "0"));
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(9);
      if (d === 0) visto0 = true;
    }
    expect(visto0).toBe(true);
  });

  it("normaliza y formatea", () => {
    expect(normalizar(" mscu-128160 8 ")).toBe("MSCU1281608");
    expect(formatear("MSCU1281608")).toBe("MSCU 128160 8");
  });
});
