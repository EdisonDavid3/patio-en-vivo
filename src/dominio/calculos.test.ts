import { describe, it, expect } from "vitest";
import { resumen, tiempoEnPatio, recorrido, type Celda } from "./calculos";
import { rango, esImprobable, formatearC } from "./temperatura";
import { instante, duracion } from "./tiempo";

describe("mínimo, máximo y promedio", () => {
  it("se calculan solo con lecturas numéricas", () => {
    const celdas: Celda[] = [{ c: -20.6 }, { c: -19.8 }, { codigo: "SE" }, null, { c: -21.4 }];
    expect(resumen(celdas)).toEqual({ min: -21.4, max: -19.8, prom: -20.6 });
  });

  it("los códigos no bajan el promedio", () => {
    const soloNumeros: Celda[] = [{ c: -20 }, { c: -22 }];
    const conCodigos: Celda[] = [{ c: -20 }, { codigo: "D" }, { c: -22 }, { codigo: "V" }, null];
    expect(resumen(conCodigos)).toEqual(resumen(soloNumeros));
  });

  it("devuelve null si no hubo ninguna lectura numérica", () => {
    expect(resumen([{ codigo: "SE" }, null])).toBeNull();
    expect(resumen([])).toBeNull();
  });

  it("redondea el promedio a un decimal", () => {
    expect(resumen([{ c: -20 }, { c: -20.1 }, { c: -20.3 }])!.prom).toBe(-20.1);
  });
});

describe("tiempo en patio", () => {
  const entrada = instante(2026, 11, 12, 8, 0);
  const ahora = instante(2026, 11, 14, 14, 0);

  it("mover de posición no lo reinicia", () => {
    const tramos = [
      { posicionId: "PN-4", desde: entrada, hasta: instante(2026, 11, 13, 9, 0) },
      { posicionId: "C-9", desde: instante(2026, 11, 13, 9, 0), hasta: null },
    ];
    expect(recorrido(tramos)).toEqual(["PN-4", "C-9"]);
    // el total se cuenta desde la entrada, no desde el último movimiento
    expect(duracion(entrada, ahora)).toBe("2 d 6 h");
    expect(tiempoEnPatio(entrada, null, ahora)).toBe(ahora - entrada);
  });

  it("al reportar la salida se congela", () => {
    const salida = instante(2026, 11, 13, 20, 0);
    expect(tiempoEnPatio(entrada, salida, ahora)).toBe(salida - entrada);
  });
});

describe("rangos de temperatura (D13)", () => {
  it("clasifica los tres tramos", () => {
    expect(rango(-22)).toBe("correcto");
    expect(rango(-18)).toBe("correcto");
    expect(rango(-17.9)).toBe("urgencia");
    expect(rango(-15)).toBe("urgencia");
    expect(rango(-14.9)).toBe("alerta");
    expect(rango(0)).toBe("alerta");
  });

  it("los límites son configurables", () => {
    expect(rango(-16, { correctoHasta: -16, urgenciaHasta: -12 })).toBe("correcto");
  });

  it("detecta valores improbables", () => {
    expect(esImprobable(18)).toBe(true);
    expect(esImprobable(-80)).toBe(true);
    expect(esImprobable(-18)).toBe(false);
  });

  it("escribe el menos tipográfico", () => {
    expect(formatearC(-18.4)).toBe("−18.4");
    expect(formatearC(-18)).toBe("−18.0");
  });
});
