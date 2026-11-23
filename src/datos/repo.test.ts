import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { db } from "./db";
import { sembrar, USUARIOS_DEMO } from "./semilla";
import { registrarLlegada, mover, reportarSalida, deshacerSalida, vistaPatio, buscar, rondaActual, lecturasDe, ubicacionesDe, guardarLecturaDeRonda, cambiarEtapa, pasarACamara, sacarDeCamara,
  tiempoPorEtapa, armarReporte, CAMARA_CARGA, diasConDatos, ultimosMovimientos,
  turnoDe, verificarSeccion, seccionesVerificadas, fijarAutor, pendientesDeEnvio } from "./repo";
import { crearUsuario, comprobarPin, abrirSesion, sesion, cerrarSesion, listarUsuarios,
  cambiarRol, activarUsuario } from "./usuarios";
import { instante as momento } from "../dominio/tiempo";
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
    // D25: a la ronda solo entran las etapas que exigen temperatura
    const enRonda = ocupadas.filter((x) => x.cuentaEnRonda);
    expect(enRonda.filter((x) => !x.medidaEnRonda)).toHaveLength(12);
    expect(enRonda.length).toBeLessThan(ocupadas.length);
  });

  it("los vacíos no se miden ni cuentan como «sin tomar»", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    const vacios = v.lista.filter((x) => x.etapa === "vacio");
    expect(vacios.length).toBeGreaterThan(0);
    expect(vacios.every((x) => !x.cuentaEnRonda)).toBe(true);
    expect(vacios.every((x) => x.ultima === null)).toBe(true);
  });

  it("los que están cargando están en Cámara 3 y 4, la única cámara de carga", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    const cargando = v.lista.filter((x) => x.etapa === "cargando");
    expect(cargando.length).toBeGreaterThan(0);
    expect(cargando.every((x) => x.posicion.zonaId === "E2")).toBe(true);
    // Cámara 1 y 2 no es de carga: ahí llegan vacíos
    expect(v.lista.filter((x) => x.posicion.zonaId === "E1" && x.estadia)
            .every((x) => x.etapa === "vacio")).toBe(true);
  });

  it("todas las posiciones tienen lectura anterior para comparar en la ronda", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    const medidas = v.lista.filter((x) => x.estadia && x.cuentaEnRonda);
    expect(medidas.every((x) => x.ultima !== null)).toBe(true);
    expect(medidas.filter((x) => x.anterior !== null).length).toBeGreaterThan(30);
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
    const estadia = (await db.estadias.filter((e) => e.salida === null && e.etapa === "con_producto").first())!;
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
    const pendiente = antes.lista.find((x) => x.cuentaEnRonda && !x.medidaEnRonda)!;
    const hechasAntes = antes.lista.filter((x) => x.cuentaEnRonda && x.medidaEnRonda).length;

    await guardarLecturaDeRonda({
      estadiaId: pendiente.estadia!.id,
      posicionId: pendiente.posicion.id,
      numero: pendiente.estadia!.numero,
      temperaturaC: -18,
      ahora: tarde,
    });

    const despues = await vistaPatio(tarde);
    expect(despues.porPosicion.get(pendiente.posicion.id)!.medidaEnRonda).toBe(true);
    expect(despues.lista.filter((x) => x.cuentaEnRonda && x.medidaEnRonda)).toHaveLength(hechasAntes + 1);
    const ls = await lecturasDe(pendiente.estadia!.id);
    const nueva = ls.at(-1)!;
    expect(nueva.horaFija).toBe(2);
    expect(nueva.atrasada).toBe(true);
  });

  it("volver atrás y guardar de nuevo corrige la celda, no la duplica", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    const p = v.lista.find((x) => x.cuentaEnRonda && !x.medidaEnRonda)!;
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

describe("etapas del contenedor", () => {
  it("el recorrido completo: vacío → enfriando → cámara → con producto → salida", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    const vacio = v.lista.find((x) => x.etapa === "vacio")!;
    const id = vacio.estadia!.id;

    await cambiarEtapa(id, "enfriando", AHORA);
    let v2 = await vistaPatio(AHORA);
    expect(v2.porPosicion.get(vacio.posicion.id)!.etapa).toBe("enfriando");
    expect(v2.porPosicion.get(vacio.posicion.id)!.cuentaEnRonda).toBe(true);

    // pasar a Cámara 3 y 4: mueve y pone a cargar de un solo paso
    const libreCamara = v2.lista.find((x) => x.posicion.zonaId === CAMARA_CARGA && !x.estadia);
    if (libreCamara) {
      expect((await pasarACamara(id, libreCamara.posicion.id, AHORA)).ok).toBe(true);
      v2 = await vistaPatio(AHORA);
      expect(v2.porPosicion.get(libreCamara.posicion.id)!.etapa).toBe("cargando");
      expect(v2.porPosicion.get(vacio.posicion.id)!.estadia).toBeNull();

      // sacarlo con producto arranca la vigilancia con alertas
      await sacarDeCamara(id, vacio.posicion.id, true, AHORA);
      v2 = await vistaPatio(AHORA);
      expect(v2.porPosicion.get(vacio.posicion.id)!.etapa).toBe("con_producto");
    }

    const tiempos = await tiempoPorEtapa(id, AHORA);
    expect(tiempos.vacio).toBeGreaterThan(0);
    expect(Object.values(tiempos).every((x) => x >= 0)).toBe(true);
  });

  it("no deja pasar a cámara una posición que no sea de Cámara 3 y 4", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    const e = v.lista.find((x) => x.etapa === "enfriando" || x.etapa === "vacio")!;
    const fuera = v.lista.find((x) => x.posicion.zonaId === "C" && !x.estadia)!;
    const res = await pasarACamara(e.estadia!.id, fuera.posicion.id, AHORA);
    expect(res.ok).toBe(false);
  });

  it("al reportar la salida desaparece del patio pero no de los registros", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    const o = v.lista.find((x) => x.etapa === "con_producto")!;
    const { id, numero } = o.estadia!;

    await reportarSalida(id, AHORA);
    const v2 = await vistaPatio(AHORA);
    // fuera del plano, de las listas y de los contadores
    expect(v2.porPosicion.get(o.posicion.id)!.estadia).toBeNull();
    expect(v2.lista.some((x) => x.estadia?.id === id)).toBe(false);
    // pero sigue en el historial y en la búsqueda
    const hits = await buscar(numero.slice(-5));
    const hallado = hits.find((h) => h.estadia.id === id)!;
    expect(hallado.enPatio).toBe(false);
    expect(hallado.estadia.salida).toBe(AHORA);
    expect(hallado.estadia.etapa).toBe("despachado");
    // y en el reporte del día
    const rep = await armarReporte("2026-11-14");
    expect(rep.filas.some((f) => f.numero === numero)).toBe(true);

    // deshacer lo devuelve a su posición y a su etapa
    await deshacerSalida(id);
    const v3 = await vistaPatio(AHORA);
    expect(v3.porPosicion.get(o.posicion.id)!.estadia?.id).toBe(id);
    expect(v3.porPosicion.get(o.posicion.id)!.etapa).toBe("con_producto");
  });

  it("una llegada entra como vacía y sin temperatura", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    const libre = v.lista.find((x) => !x.estadia)!;
    const res = await registrarLlegada({
      posicionId: libre.posicion.id, numero: "MSCU1281608", ahora: AHORA,
    });
    expect(res.ok).toBe(true);
    const v2 = await vistaPatio(AHORA);
    const e = v2.porPosicion.get(libre.posicion.id)!;
    expect(e.etapa).toBe("vacio");
    expect(e.ultima).toBeNull();
    expect(e.cuentaEnRonda).toBe(false);
  });
});

describe("datos de demostración coherentes", () => {
  it("un contenedor enfriando viene bajando desde caliente, nunca a −40", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    const enfriando = v.lista.filter((x) => x.etapa === "enfriando");
    expect(enfriando.length).toBeGreaterThan(0);
    for (const x of enfriando) {
      const ls = (await lecturasDe(x.estadia!.id)).filter((l) => l.c !== null);
      expect(ls.length).toBeGreaterThan(0);
      for (const l of ls) {
        expect(l.c!).toBeLessThan(22);
        expect(l.c!).toBeGreaterThan(-24);
      }
      // la serie baja: la primera es más caliente que la última
      if (ls.length > 2) expect(ls[0]!.c!).toBeGreaterThan(ls.at(-1)!.c!);
    }
  });

  it("queda cupo libre en la cámara de carga", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    const camara = v.lista.filter((x) => x.posicion.zonaId === CAMARA_CARGA);
    expect(camara).toHaveLength(6);
    expect(camara.filter((x) => !x.estadia).length).toBeGreaterThan(0);
  });
});

describe("reporte oficial con etapas (D34 y D35)", () => {
  it("la hoja lleva solo los que se miden; los vacíos quedan fuera y se cuentan", async () => {
    await sembrar(AHORA);
    const rep = await armarReporte("2026-11-14");
    const v = await vistaPatio(AHORA);
    const vacios = v.lista.filter((x) => x.etapa === "vacio").length;
    expect(vacios).toBeGreaterThan(0);
    expect(rep.vaciosFuera).toBe(vacios);
    for (const f of rep.filas) expect(f.etapa).not.toBe("vacio");
  });

  it("el ESTADO sale con la letra del formato y «enfriando» va como V", async () => {
    await sembrar(AHORA);
    const rep = await armarReporte("2026-11-14");
    const porEtapa = new Map(rep.filas.map((f) => [f.etapa, f.estado]));
    expect(porEtapa.get("cargando")).toBe("C");
    expect(porEtapa.get("con_producto")).toBe("E");
    if (porEtapa.has("enfriando")) expect(porEtapa.get("enfriando")).toBe("V");
    expect([...porEtapa.values()].every((x) => ["V", "C", "E", "D"].includes(x))).toBe(true);
  });

  it("solo las filas con producto llevan las lecturas marcadas como fuera de rango", async () => {
    await sembrar(AHORA);
    const rep = await armarReporte("2026-11-14");
    for (const f of rep.filas) expect(f.vigilada).toBe(f.etapa === "con_producto");
    const enfriando = rep.filas.find((f) => f.etapa === "enfriando");
    if (enfriando) expect(enfriando.vigilada).toBe(false);
  });

  it("un contenedor que se enfría se explica en Observaciones, no como incumplimiento", async () => {
    await sembrar(AHORA);
    const rep = await armarReporte("2026-11-14");
    if (rep.filas.some((f) => f.etapa === "enfriando")) {
      expect(rep.observaciones.some((o) => o.texto.includes("enfriamiento"))).toBe(true);
    }
    expect(rep.observaciones.some((o) => o.texto.includes("fuera de rango") && o.texto.includes("enfriamiento"))).toBe(false);
  });

  it("un contenedor despachado durante el día sigue saliendo en la hoja", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    const o = v.lista.find((x) => x.etapa === "con_producto")!;
    const numero = o.estadia!.numero;
    await reportarSalida(o.estadia!.id, AHORA);
    const rep = await armarReporte("2026-11-14");
    const fila = rep.filas.find((f) => f.numero === numero);
    expect(fila).toBeDefined();
    expect(fila!.estado).toBe("D");
    expect(fila!.salida).toBe(AHORA);
  });
});

describe("la demostración trae varios días (modo de prueba)", () => {
  it("hay al menos cuatro días operativos con lecturas", async () => {
    await sembrar(AHORA);
    const dias = await diasConDatos();
    expect(dias.length).toBeGreaterThanOrEqual(4);
    expect(dias[0]).toBe("2026-11-14"); // el más nuevo primero
  });

  it("un día ya cerrado tiene las 12 tomas, no medio gráfico", async () => {
    await sembrar(AHORA);
    const rep = await armarReporte("2026-11-12");
    expect(rep.filas.length).toBeGreaterThan(5);
    const completas = rep.filas.filter((f) => f.celdas.filter(Boolean).length === 12);
    expect(completas.length).toBeGreaterThan(3);
  });

  it("un contenedor enfriando solo lleva unas horas midiéndose, no días", async () => {
    await sembrar(AHORA);
    const v = await vistaPatio(AHORA);
    const enfriando = v.lista.filter((x) => x.etapa === "enfriando");
    for (const x of enfriando) {
      const ls = await lecturasDe(x.estadia!.id);
      expect(ls.length).toBeLessThanOrEqual(12);
      expect(ls.length).toBeGreaterThan(0);
    }
  });
});

describe("usuarios, PIN y sesión", () => {
  it("crea un usuario y lo deja entrar con su PIN", async () => {
    const r = await crearUsuario({ nombre: "Pedro Mera", rol: "patero", pin: "4821" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect((await comprobarPin(r.usuario.id, "4821")).ok).toBe(true);
    const malo = await comprobarPin(r.usuario.id, "0000");
    expect(malo.ok).toBe(false);
    if (!malo.ok) expect(malo.error).toContain("PIN");
  });

  it("nunca guarda el PIN en claro", async () => {
    const r = await crearUsuario({ nombre: "Ana Loor", rol: "patero", pin: "7391" });
    if (!r.ok) throw new Error("no se creó");
    expect(JSON.stringify(r.usuario)).not.toContain("7391");
    expect(r.usuario.huellaPin).toHaveLength(64);
    // dos usuarios con el mismo PIN tienen huellas distintas: cada uno lleva su sal
    const otro = await crearUsuario({ nombre: "Luis Vera", rol: "patero", pin: "7391" });
    if (!otro.ok) throw new Error("no se creó");
    expect(otro.usuario.huellaPin).not.toBe(r.usuario.huellaPin);
  });

  it("exige PIN de 6 números para el administrador y de 4 para los demás", async () => {
    expect((await crearUsuario({ nombre: "Jefa Uno", rol: "administrador", pin: "1234" })).ok).toBe(false);
    expect((await crearUsuario({ nombre: "Jefa Dos", rol: "administrador", pin: "123456" })).ok).toBe(true);
    expect((await crearUsuario({ nombre: "Pat Uno", rol: "patero", pin: "123456" })).ok).toBe(false);
  });

  it("no deja dos usuarios con el mismo nombre", async () => {
    await crearUsuario({ nombre: "Repetido Uno", rol: "patero", pin: "1111" });
    const dos = await crearUsuario({ nombre: "repetido uno", rol: "patero", pin: "2222" });
    expect(dos.ok).toBe(false);
  });

  it("la sesión se queda abierta en el aparato y se puede cerrar", async () => {
    const r = await crearUsuario({ nombre: "Sesión Prueba", rol: "patero", pin: "5555" });
    if (!r.ok) throw new Error("no se creó");
    expect(await sesion()).toBeNull();
    await abrirSesion(r.usuario.id);
    expect((await sesion())?.nombre).toBe("Sesión Prueba");
    await cerrarSesion();
    expect(await sesion()).toBeNull();
  });

  it("un usuario desactivado no entra, aunque su sesión estuviera abierta", async () => {
    const r = await crearUsuario({ nombre: "Baja Prueba", rol: "patero", pin: "6666" });
    if (!r.ok) throw new Error("no se creó");
    await abrirSesion(r.usuario.id);
    await activarUsuario(r.usuario.id, false);
    expect(await sesion()).toBeNull();
    expect((await comprobarPin(r.usuario.id, "6666")).ok).toBe(false);
  });

  it("subir a administrador obliga a poner un PIN más largo", async () => {
    const r = await crearUsuario({ nombre: "Sube Prueba", rol: "patero", pin: "1212" });
    if (!r.ok) throw new Error("no se creó");
    expect((await cambiarRol(r.usuario.id, "administrador")).ok).toBe(false);
    expect((await cambiarRol(r.usuario.id, "administrador", "998877")).ok).toBe(true);
    expect((await comprobarPin(r.usuario.id, "998877")).ok).toBe(true);
  });

  it("la demostración trae los tres roles", async () => {
    await sembrar(AHORA);
    const { crearUsuario: _c } = await import("./usuarios");
    for (const u of USUARIOS_DEMO) {
      const r = await crearUsuario({ nombre: u.nombre, rol: u.rol, pin: u.pin });
      expect(r.ok).toBe(true); // se crean desde cero en esta base de prueba
    }
    const lista = await listarUsuarios();
    expect(lista.map((u) => u.rol).sort()).toEqual(["administrador", "patero", "visualizador"]);
  });
});

describe("últimos movimientos", () => {
  it("escribe en palabras lo que pasó, con quién lo hizo", async () => {
    await sembrar(AHORA);
    const r = await crearUsuario({ nombre: "Danilo Zambrano", rol: "patero", pin: "1234" });
    if (!r.ok) throw new Error("no se creó");
    fijarAutor(r.usuario.id);

    const v = await vistaPatio(AHORA);
    const libre = v.lista.find((x) => !x.estadia)!;
    await registrarLlegada({ posicionId: libre.posicion.id, numero: "MSCU1281608", ahora: AHORA });
    const o = v.lista.find((x) => x.etapa === "con_producto")!;
    const otraLibre = v.lista.filter((x) => !x.estadia)[1]!;
    await mover(o.estadia!.id, otraLibre.posicion.id, AHORA);

    const movs = await ultimosMovimientos(10);
    expect(movs.length).toBeGreaterThanOrEqual(2);
    expect(movs[0]!.quien).toBe("Danilo");
    expect(movs.some((m) => m.texto.includes("movió") && m.texto.includes("MSCU") === false || m.texto.includes("movió"))).toBe(true);
    const llegada = movs.find((m) => m.tipo === "llegada")!;
    expect(llegada.texto).toContain("MSCU 128160 8");
    expect(llegada.texto).toContain(libre.posicion.id.replace("-", " "));
    // vienen del más nuevo al más viejo
    expect(movs[0]!.ms).toBeGreaterThanOrEqual(movs[movs.length - 1]!.ms);
  });
});

describe("verificación de turno", () => {
  it("distingue turno día y turno noche", () => {
    expect(turnoDe(momento(2026, 11, 23, 10, 0))).toBe("dia");
    expect(turnoDe(momento(2026, 11, 23, 18, 59))).toBe("dia");
    expect(turnoDe(momento(2026, 11, 23, 19, 0))).toBe("noche");
    expect(turnoDe(momento(2026, 11, 24, 3, 0))).toBe("noche");
    expect(turnoDe(momento(2026, 11, 24, 7, 0))).toBe("dia");
  });

  it("guarda qué secciones se verificaron en este turno", async () => {
    await sembrar(AHORA);
    expect((await seccionesVerificadas(AHORA)).size).toBe(0);
    await verificarSeccion("C", "Sector C", 0, AHORA);
    await verificarSeccion("B", "Sector B", 2, AHORA);
    const hechas = await seccionesVerificadas(AHORA);
    expect([...hechas].sort()).toEqual(["B", "C"]);
    // el turno de noche empieza de cero
    expect((await seccionesVerificadas(momento(2026, 11, 14, 22, 0))).size).toBe(0);
  });

  it("verificar queda en los movimientos", async () => {
    await sembrar(AHORA);
    await verificarSeccion("C", "Sector C", 0, AHORA);
    const movs = await ultimosMovimientos(5);
    expect(movs[0]!.texto).toContain("Sector C");
    expect(movs[0]!.texto).toContain("todo correcto");
  });
});

describe("la demostración trae historia de movimientos", () => {
  it("al abrir ya hay movimientos escritos en palabras", async () => {
    await sembrar(AHORA);
    // lo más nuevo son las tomas de temperatura
    const nuevos = await ultimosMovimientos(30);
    expect(nuevos.length).toBe(30);
    expect(nuevos.every((m) => m.texto.length > 10)).toBe(true);
    expect(nuevos.some((m) => m.texto.includes("midió"))).toBe(true);
    expect(nuevos[0]!.ms).toBeGreaterThanOrEqual(nuevos.at(-1)!.ms);

    // mirando más atrás aparecen llegadas y cambios de etapa
    const todos = await ultimosMovimientos(500);
    const tipos = new Set(todos.map((m) => m.tipo));
    expect(tipos.has("llegada")).toBe(true);
    expect(tipos.has("cambio-etapa")).toBe(true);
    expect(todos.find((m) => m.tipo === "llegada")!.texto).toContain("registró la llegada");
  });

  it("la historia sembrada no cuenta como pendiente de enviar", async () => {
    await sembrar(AHORA);
    expect(await pendientesDeEnvio()).toBe(0);
  });
});
