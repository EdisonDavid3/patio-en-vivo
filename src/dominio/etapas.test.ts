import { describe, it, expect } from "vitest";
import { ETAPAS, ORDEN_ETAPAS, exigeTemperatura, vigilada, entraEnRonda,
         listoParaCargar, faltaParaCargar, siguientes } from "./etapas";
import { CODIGOS } from "./temperatura";

describe("etapas del contenedor", () => {
  it("solo se mide a partir de que se enciende", () => {
    expect(exigeTemperatura("vacio")).toBe(false);
    expect(exigeTemperatura("enfriando")).toBe(true);
    expect(exigeTemperatura("cargando")).toBe(true);
    expect(exigeTemperatura("con_producto")).toBe(true);
    expect(exigeTemperatura("despachado")).toBe(false);
  });

  it("las alertas de −18 / −15 solo aplican con producto a bordo", () => {
    expect(vigilada("con_producto")).toBe(true);
    for (const e of ["vacio", "enfriando", "cargando", "despachado"] as const) {
      expect(vigilada(e)).toBe(false);
    }
  });

  it("la ronda y el «sin tomar» solo cuentan lo que se mide", () => {
    for (const e of ORDEN_ETAPAS) expect(entraEnRonda(e)).toBe(exigeTemperatura(e));
  });

  it("cuatro de las cinco etapas son exactamente los códigos del formato oficial", () => {
    const letras = CODIGOS.map((c) => c.codigo);
    expect(ETAPAS.vacio.codigoOficial).toBe("V");
    expect(ETAPAS.cargando.codigoOficial).toBe("C");
    expect(ETAPAS.con_producto.codigoOficial).toBe("E");
    expect(ETAPAS.despachado.codigoOficial).toBe("D");
    for (const e of ["vacio", "cargando", "con_producto", "despachado"] as const) {
      expect(letras).toContain(ETAPAS[e].codigoOficial!);
    }
    // «Enfriando» es la única que la norma no contempla
    expect(ETAPAS.enfriando.codigoOficial).toBeNull();
    // y SE (sin energía) no es una etapa: es el motivo de una toma fallida
    expect(ORDEN_ETAPAS.map((e) => ETAPAS[e].codigoOficial)).not.toContain("SE");
  });

  it("avisa cuándo el contenedor ya se puede cargar", () => {
    expect(listoParaCargar(-18)).toBe(true);
    expect(listoParaCargar(-20.4)).toBe(true);
    expect(listoParaCargar(-12)).toBe(false);
    expect(listoParaCargar(null)).toBe(false);
    expect(faltaParaCargar(-12)).toBe(6);
    expect(faltaParaCargar(-18.6)).toBeNull();
    expect(faltaParaCargar(null)).toBeNull();
  });

  it("propone solo los pasos que tienen sentido", () => {
    expect(siguientes("vacio")).toEqual(["enfriando"]);
    expect(siguientes("enfriando")).toContain("cargando");
    expect(siguientes("cargando")).toContain("con_producto");
    expect(siguientes("con_producto")).toEqual(["despachado"]);
    expect(siguientes("despachado")).toEqual([]);
  });
});
