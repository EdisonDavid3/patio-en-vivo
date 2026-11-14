import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { db } from "./db";
import { sembrar } from "./semilla";
import { registrarLlegada, mover, reportarSalida, deshacerSalida, vistaPatio, buscar, rondaActual, lecturasDe, ubicacionesDe, guardarLecturaDeRonda } from "./repo";
import { instante, duracion } from "../dominio/tiempo";
import { resumen, type Celda } from "../dominio/calculos";

const AHORA = instante(2026, 11, 14, 10, 42);

beforeEach(async () => {
  for (const t of db.tables) await t.clear();
});

describe("semilla de demostración", () => {
  it("deja 52 ocupadas de 115 y la ronda a medio hacer", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    expect(v.lista).toHaveLength(115);
    const ocupadas = v.lista.filter((x) => x.estadia);
    expect(ocupadas).toHaveLength(52);
    expect(v.ronda.horaFija).toBe(10);
    expect(v.ronda.dia).toBe("2026-11-14");
    expect(ocupadas.filter((x) => !x.medidaEnRonda)).toHaveLength(15);
  });

  it("todas las posiciones tienen lectura anterior para comparar en la ronda", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    const ocupadas = v.lista.filter((x) => x.estadia);
    expect(ocupadas.every((x) => x.ultima !== null)).toBe(true);
    expect(ocupadas.filter((x) => x.anterior !== null).length).toBeGreaterThan(45);
  });
});

describe("registrar llegada", () => {
  it("guarda contenedor, posición y la primera temperatura", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    const libre = v.lista.find((x) => !x.estadia)!;
    const res = await registrarLlegada({
      posicionId: libre.posicion.id, numero: "MSCU1281608", temperaturaC: -19.2, ahora: AHORA,
    });
    expect(res.ok).toBe(true);
    const v2 = await vistaPatio(AHORA);
    const ahoraOcupada = v2.porPosicion.get(libre.posicion.id)!;
    expect(ahoraOcupada.estadia?.numero).toBe("MSCU1281608");
    expect(ahoraOcupada.ultima?.c).toBe(-19.2);
    expect(ahoraOcupada.medidaEnRonda).toBe(true);
  });

  it("no deja el mismo contenedor en dos posiciones", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    const libres = v.lista.filter((x) => !x.estadia);
    await registrarLlegada({ posicionId: libres[0]!.posicion.id, numero: "MSCU1281608", temperaturaC: -19, ahora: AHORA });
    const dup = await registrarLlegada({ posicionId: libres[1]!.posicion.id, numero: "MSCU1281608", temperaturaC: -19, ahora: AHORA });
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.error).toContain("ya está en el patio");
  });

  it("no deja ocupar una posición que ya tiene contenedor", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    const ocupada = v.lista.find((x) => x.estadia)!;
    const res = await registrarLlegada({ posicionId: ocupada.posicion.id, numero: "TGHU7340015", temperaturaC: -19, ahora: AHORA });
    expect(res.ok).toBe(false);
  });
});

describe("mover y salida", () => {
  it("mover no reinicia el tiempo en patio", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    const o = v.lista.find((x) => x.estadia)!;
    const libre = v.lista.find((x) => !x.estadia)!;
    const entrada = o.estadia!.entrada;
    const antes = duracion(entrada, AHORA);

    await mover(o.estadia!.id, libre.posicion.id, AHORA);
    const v2 = await vistaPatio(AHORA);
    expect(v2.porPosicion.get(libre.posicion.id)!.estadia?.id).toBe(o.estadia!.id);
    expect(v2.porPosicion.get(o.posicion.id)!.estadia).toBeNull();
    // la estadía sigue siendo la misma y la entrada no cambió
    expect(v2.porPosicion.get(libre.posicion.id)!.estadia!.entrada).toBe(entrada);
    expect(duracion(entrada, AHORA)).toBe(antes);
    const tramos = await ubicacionesDe(o.estadia!.id);
    expect(tramos.at(-1)!.posicionId).toBe(libre.posicion.id);
    expect(tramos.at(-1)!.hasta).toBeNull();
  });

  it("la salida libera la posición y se puede deshacer", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    const o = v.lista.find((x) => x.estadia)!;
    await reportarSalida(o.estadia!.id, AHORA);
    expect((await vistaPatio(AHORA)).porPosicion.get(o.posicion.id)!.estadia).toBeNull();
    await deshacerSalida(o.estadia!.id);
    expect((await vistaPatio(AHORA)).porPosicion.get(o.posicion.id)!.estadia?.id).toBe(o.estadia!.id);
  });
});

describe("buscar por los últimos dígitos", () => {
  it("encuentra lo que está en el patio y lo que ya salió", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    const numero = v.lista.find((x) => x.estadia)!.estadia!.numero;
    const hits = await buscar(numero.slice(-5, -1));
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.estadia.numero === numero && h.enPatio && h.posicionId)).toBe(true);
    const salido = await db.estadias.get("e-salido");
    const hits2 = await buscar(salido!.numero.slice(-5));
    expect(hits2.some((h) => !h.enPatio)).toBe(true);
  });

  it("no busca con menos de dos caracteres", async () => {
    await sembrar(AHORA);
    expect(await buscar("8")).toEqual([]);
  });
});

describe("ronda en curso", () => {
  it("es la última hora fija que ya pasó", async () => {
    expect(rondaActual(instante(2026, 11, 14, 10, 42)).horaFija).toBe(10);
    expect(rondaActual(instante(2026, 11, 14, 9, 59)).horaFija).toBe(8);
    expect(rondaActual(instante(2026, 11, 14, 0, 30))).toMatchObject({ horaFija: 0, dia: "2026-11-13" });
    expect(rondaActual(instante(2026, 11, 14, 7, 30))).toMatchObject({ horaFija: 6, dia: "2026-11-13" });
  });
});

describe("el reporte del día cierra bien", () => {
  it("mínimo, máximo y promedio del día operativo anterior salen de sus lecturas", async () => {
    await sembrar(AHORA);
    const estadia = (await db.estadias.filter((e) => e.salida === null).first())!;
    const ls = (await lecturasDe(estadia.id)).filter((l) => l.dia === "2026-11-13");
    expect(ls.length).toBeGreaterThan(5);
    const celdas: Celda[] = ls.map((l) => (l.c !== null ? { c: l.c } : l.codigo ? { codigo: l.codigo } : null));
    const res = resumen(celdas)!;
    const nums = ls.filter((l) => l.c !== null).map((l) => l.c!);
    expect(res.min).toBe(Math.min(...nums));
    expect(res.max).toBe(Math.max(...nums));
  });
});

describe("guardar durante la ronda", () => {
  it("la lectura cuenta para la ronda abierta, aunque el reloj ya esté cerca de la siguiente", async () => {
    // 03:23 está más cerca de las 04:00, pero la ronda en curso es la de las 02:00
    const tarde = instante(2026, 11, 14, 3, 23);
    await sembrar(tarde);
    const antes = await vistaPatio(tarde);
    expect(antes.ronda.horaFija).toBe(2);
    const pendiente = antes.lista.find((x) => x.estadia && !x.medidaEnRonda)!;
    const hechasAntes = antes.lista.filter((x) => x.estadia && x.medidaEnRonda).length;

    await guardarLecturaDeRonda({
      estadiaId: pendiente.estadia!.id,
      posicionId: pendiente.posicion.id,
      numero: pendiente.estadia!.numero,
      temperaturaC: -18,
      ahora: tarde,
    });

    const despues = await vistaPatio(tarde);
    expect(despues.porPosicion.get(pendiente.posicion.id)!.medidaEnRonda).toBe(true);
    expect(despues.lista.filter((x) => x.estadia && x.medidaEnRonda)).toHaveLength(hechasAntes + 1);
    const ls = await lecturasDe(pendiente.estadia!.id);
    const nueva = ls.at(-1)!;
    expect(nueva.horaFija).toBe(2);
    expect(nueva.atrasada).toBe(true);
  });

  it("volver atrás y guardar de nuevo corrige la celda, no la duplica", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    const p = v.lista.find((x) => x.estadia && !x.medidaEnRonda)!;
    const args = { estadiaId: p.estadia!.id, posicionId: p.posicion.id, numero: p.estadia!.numero, ahora: AHORA };
    await guardarLecturaDeRonda({ ...args, temperaturaC: -18 });
    const n1 = (await lecturasDe(p.estadia!.id)).length;
    await guardarLecturaDeRonda({ ...args, temperaturaC: -20.5 });
    const ls = await lecturasDe(p.estadia!.id);
    expect(ls).toHaveLength(n1);                 // no se duplicó
    expect(ls.at(-1)!.c).toBe(-20.5);            // quedó corregida
  });
});

describe("orden de las posiciones", () => {
  it("van por número, no por orden alfabético", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    const c = v.lista.filter((x) => x.posicion.zonaId === "C").map((x) => x.posicion.numero);
    expect(c.slice(0, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(c.at(-1)).toBe(22);
    // y las zonas siguen el orden de la hoja
    const zonas = [...new Set(v.lista.map((x) => x.posicion.zonaId))];
    expect(zonas).toEqual(["E1", "E2", "C", "B", "OF", "A", "PN"]);
    // E2 conserva su numeración del papel: 6 a 11
    const e2 = v.lista.filter((x) => x.posicion.zonaId === "E2").map((x) => x.posicion.numero);
    expect(e2).toEqual([6, 7, 8, 9, 10, 11]);
  });
});
