/**
 * Datos de demostración para la Fase 0. Todo ficticio, con números de contenedor
 * que sí cumplen ISO 6346. No hay un solo dato real de la empresa.
 */
import { db } from "./db";
import { ZONAS, TODAS_POSICIONES } from "./zonas";
import { digitoVerificador } from "../dominio/iso6346";
import { diaOperativo, ranurasDelDia, HORAS_FIJAS } from "../dominio/tiempo";
import { rondaActual, USUARIO_DEMO } from "./repo";
import { crearUsuario, abrirSesion } from "./usuarios";
import type { Estadia, Evento, Lectura, TramoEtapa, Ubicacion } from "./tipos";
import { exigeTemperatura, IDEAL_PARA_CARGAR, type Etapa } from "../dominio/etapas";

const PREFIJOS = ["MSCU","TGHU","CMAU","MSKU","TRLU","HLXU","SUDU","CAIU","GESU","MRKU",
                  "TCLU","SEGU","BMOU","HASU","OOLU","APZU","FCIU","INKU","DFSU","TEMU"];
const PRODUCTOS = ["HOSO 20/30","HOSO 30/40","HOSO 40/50","HOSO 50/60","HLSO 31/40",
                   "HLSO 41/50","HLSO 61/70","P&D 51/60","PUD 71/90","EZP 41/50"];
const ESTADOS = ["En espera","Cargando","En espera","En espera","Cargando","En espera"];

function azar(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function numeroValido(r: () => number, usados: Set<string>): string {
  for (;;) {
    const p = PREFIJOS[Math.floor(r() * PREFIJOS.length)]!;
    const s = String(Math.floor(r() * 900000) + 100000);
    const n = p + s + digitoVerificador(p + s);
    if (!usados.has(n)) { usados.add(n); return n; }
  }
}

/** Todas las horas fijas entre dos instantes, con su día operativo e índice. */
function ranurasEntre(desdeMs: number, hastaMs: number) {
  const out: { dia: string; indice: number; ms: number }[] = [];
  const dias = new Set<string>();
  for (let t = desdeMs - 86_400_000; t <= hastaMs + 86_400_000; t += 43_200_000) dias.add(diaOperativo(t));
  for (const dia of [...dias].sort()) {
    ranurasDelDia(dia).forEach((ms, indice) => {
      if (ms >= desdeMs && ms <= hastaMs) out.push({ dia, indice, ms });
    });
  }
  return out.sort((a, b) => a.ms - b.ms);
}

export async function sembrarSiHaceFalta(ahora = Date.now()): Promise<void> {
  await sembrarUsuarios();
  if ((await db.estadias.count()) > 0) return;
  await sembrar(ahora);
}

/** Días operativos completos que trae la demostración. */
export const DIAS_DEMO = 5;

export async function sembrar(ahora = Date.now()): Promise<void> {
  const r = azar(20261114);
  const ronda = rondaActual(ahora);
  const usados = new Set<string>();

  const libres = [...TODAS_POSICIONES];
  // 52 ocupadas de 115, repartidas por todo el patio
  const cupos: Record<string, number> = { E1: 5, E2: 4, C: 16, B: 8, OF: 2, A: 15, PN: 2 };
  const elegidas: string[] = [];
  for (const z of ZONAS) {
    const dela = libres.filter((p) => p.zonaId === z.id);
    const mezcla = dela.map((p) => ({ p, k: r() })).sort((a, b) => a.k - b.k).map((x) => x.p);
    elegidas.push(...mezcla.slice(0, cupos[z.id] ?? 0).map((p) => p.id));
  }

  const estadias: Estadia[] = [];
  const ubicaciones: Ubicacion[] = [];
  const tramos: TramoEtapa[] = [];
  const lecturas: Lectura[] = [];
  const eventos: Evento[] = [];
  let n = 0;

  // los movimientos de la demostración quedan repartidos entre los usuarios de prueba
  const gente = (await db.usuarios.toArray()).filter((u) => u.rol !== "visualizador");
  const quien = (k: number) => gente[k % Math.max(1, gente.length)]?.id ?? USUARIO_DEMO;
  let ev = 0;
  const anota = (tipo: string, carga: unknown, ms: number) => {
    eventos.push({
      id: `ev-${ev}`, tipo, carga, usuarioId: quien(ev++), dispositivoId: "demo",
      creadoMs: ms, enviadoMs: ms,   // historia ya enviada: no infla el contador de pendientes
    });
  };

  /**
   * Etapa según dónde está, como en el patio de verdad:
   * Cámara 3 y 4 es la única cámara de carga; Cámara 1 y 2 recibe contenedores vacíos.
   */
  function etapaDe(posicionId: string, az: number): Etapa {
    const zona = posicionId.split("-")[0];
    if (zona === "E2") return "cargando";
    if (zona === "E1") return "vacio";
    if (az < 0.14) return "vacio";
    if (az < 0.26) return "enfriando";
    return "con_producto";
  }

  // la etapa se decide primero: de ella depende si al contenedor se le toma temperatura
  const etapaPorPosicion = new Map(elegidas.map((id) => [id, etapaDe(id, r())]));

  // de las que SÍ se miden, 12 quedan sin tomar en la ronda en curso
  const medibles = elegidas.filter((id) => exigeTemperatura(etapaPorPosicion.get(id)!));
  const sinTomar = new Set(
    medibles.map((id) => ({ id, k: r() })).sort((a, b) => a.k - b.k).slice(0, 12).map((x) => x.id),
  );

  for (const posicionId of elegidas) {
    n++;
    const numero = numeroValido(r, usados);
    const id = `e-${n}`;
    const diasAtras = 1 + Math.floor(r() * (DIAS_DEMO + 2));
    const entrada = ahora - diasAtras * 86_400_000 - Math.floor(r() * 10) * 3600_000;

    const etapa = etapaPorPosicion.get(posicionId)!;
    const conProducto = etapa === "con_producto";

    // Con producto: casi todo correcto, algunos en urgencia, pocos en alerta.
    const d = r();
    const base = d < 0.84 ? -22.4 + r() * 4 : d < 0.95 ? -17.9 + r() * 2.7 : -14.9 + r() * 2.4;
    // Enfriando: entra caliente (el aire del patio) y va bajando unos 2,4 °C cada 2 horas
    // hasta asentarse cerca de −20. Unos ya llegaron y otros van a medio camino.
    const ARRANQUE = 19;        // °C al encender
    const BAJA = 2.4;           // °C que baja por cada hora fija
    const PISO = -20.5;
    const yaBajo = Math.floor(r() * 15);  // cuántas tomas lleva enfriando

    estadias.push({
      id, numero, entrada, salida: null,
      producto: conProducto ? PRODUCTOS[Math.floor(r() * PRODUCTOS.length)]! : "",
      sello: conProducto ? "EC" + String(Math.floor(r() * 900000) + 100000) : "",
      estado: ESTADOS[Math.floor(r() * ESTADOS.length)]!,
      conAdvertencia: n === 7, suspendido: null, etapa, nota: "",
    });

    anota("llegada", { estadiaId: id, posicionId, numero, etapa: "vacio" }, entrada);

    // historial de etapas: lo recorrido hasta llegar a la actual
    const pasos: Etapa[] = etapa === "vacio" ? ["vacio"]
      : etapa === "enfriando" ? ["vacio", "enfriando"]
      : etapa === "cargando" ? ["vacio", "enfriando", "cargando"]
      : ["vacio", "enfriando", "cargando", "con_producto"];
    const paso = Math.max(1, Math.floor((ahora - entrada) / pasos.length));
    pasos.forEach((et, j) => {
      tramos.push({
        id: `te-${n}-${j}`, estadiaId: id, etapa: et,
        desde: entrada + j * paso,
        hasta: j === pasos.length - 1 ? null : entrada + (j + 1) * paso,
        usuarioId: USUARIO_DEMO,
      });
      if (j > 0) {
        anota("cambio-etapa", { estadiaId: id, numero, posicionId, de: pasos[j - 1], a: et },
          entrada + j * paso);
      }
    });

    // una de cada seis pasó antes por otra posición: mover no reinicia el tiempo en patio
    if (n % 6 === 0) {
      const previa = libres.find((p) => !elegidas.includes(p.id) && p.zonaId === "PN")?.id;
      const corte = entrada + 12 * 3600_000;
      if (previa && corte < ahora) {
        ubicaciones.push({ id: `u-${n}a`, estadiaId: id, posicionId: previa, desde: entrada, hasta: corte });
        ubicaciones.push({ id: `u-${n}b`, estadiaId: id, posicionId, desde: corte, hasta: null });
        anota("mover", { estadiaId: id, numero, de: previa, a: posicionId }, corte);
      } else {
        ubicaciones.push({ id: `u-${n}`, estadiaId: id, posicionId, desde: entrada, hasta: null });
      }
    } else {
      ubicaciones.push({ id: `u-${n}`, estadiaId: id, posicionId, desde: entrada, hasta: null });
    }

    // D25: a los vacíos no se les toma temperatura, así que no tienen lecturas
    if (!exigeTemperatura(etapa)) continue;

    // Lecturas de los últimos días operativos, en cada hora fija.
    // Un contenedor enfriando se enciende poco antes de cargar: solo lleva unas horas midiéndose.
    const ventanaMs = etapa === "enfriando" ? 20 * 3600_000 : DIAS_DEMO * 86_400_000;
    const desde = Math.max(entrada, ahora - ventanaMs);
    let i = 0;
    for (const ranura of ranurasEntre(desde, ronda.ms)) {
      i++;
      const ultima = ranura.dia === ronda.dia && ranura.indice === ronda.indice;
      if (ultima && sinTomar.has(posicionId)) continue;
      const c = etapa === "enfriando"
        ? Math.round(Math.max(PISO, ARRANQUE - (yaBajo + i) * BAJA + (r() - 0.5) * 0.9) * 10) / 10
        : Math.round((base + (r() - 0.5) * 1.3) * 10) / 10;
      const desfase = Math.floor(r() * 44) - 4;
      // un contenedor sin energía al momento de la toma (D3)
      const codigo = n === 11 && ultima ? ("SE" as const) : null;
      // solo las tomas de las últimas horas entran en los movimientos: si no, serían miles
      if (ranura.ms > ahora - 14 * 3600_000) {
        anota("lectura", { estadiaId: id, numero, posicionId, c: codigo ? null : c, codigo },
          ranura.ms + desfase * 60_000);
      }
      lecturas.push({
        id: `l-${n}-${i}`, estadiaId: id, posicionId, numero,
        tomadaMs: ranura.ms + desfase * 60_000,
        dia: ranura.dia, indice: ranura.indice, horaFija: HORAS_FIJAS[ranura.indice]!,
        c: codigo ? null : c, codigo,
        atrasada: Math.abs(desfase) > 50, usuarioId: USUARIO_DEMO, nota: "",
      });
    }
  }

  // un contenedor que ya salió, para que la búsqueda en el historial muestre algo
  const numSalido = numeroValido(r, usados);
  estadias.push({
    id: "e-salido", numero: numSalido, entrada: ahora - 6 * 86_400_000, salida: ahora - 2 * 86_400_000,
    producto: "HOSO 30/40", sello: "EC778410", estado: "Despachado",
    conAdvertencia: false, suspendido: null, etapa: "despachado", nota: "Despachado al buque.",
  });
  ubicaciones.push({
    id: "u-salido", estadiaId: "e-salido", posicionId: "PN-20",
    desde: ahora - 6 * 86_400_000, hasta: ahora - 2 * 86_400_000,
  });
  tramos.push({
    id: "te-salido", estadiaId: "e-salido", etapa: "despachado",
    desde: ahora - 2 * 86_400_000, hasta: null, usuarioId: USUARIO_DEMO,
  });

  await db.transaction("rw",
    [db.zonas, db.posiciones, db.contenedores, db.estadias, db.ubicaciones, db.tramosEtapa,
     db.lecturas, db.eventos, db.usuarios, db.ajustes],
    async () => {
      await db.zonas.bulkPut(ZONAS);
      await db.posiciones.bulkPut(TODAS_POSICIONES);
      await db.contenedores.bulkPut(
        estadias.map((e) => ({ numero: e.numero, prefijo: e.numero.slice(0, 4), extra: {} })),
      );
      await db.estadias.bulkPut(estadias);
      await db.ubicaciones.bulkPut(ubicaciones);
      await db.tramosEtapa.bulkPut(tramos);
      await db.lecturas.bulkPut(lecturas);
      await db.eventos.bulkPut(eventos.sort((a, b) => a.creadoMs - b.creadoMs));

      await db.ajustes.bulkPut([
        { clave: "modo", valor: "demo" },
        { clave: "sembradoMs", valor: ahora },
        { clave: "idealParaCargar", valor: IDEAL_PARA_CARGAR },
      ]);
    });
}

/** Los tres roles, para que se puedan probar. Es una demostración: los PIN se ven en la hoja 🧪. */
export const USUARIOS_DEMO = [
  { nombre: "Jorge Torres", rol: "administrador" as const, pin: "123456" },
  { nombre: "Danilo Zambrano", rol: "patero" as const, pin: "1234" },
  { nombre: "Marcela Vera", rol: "visualizador" as const, pin: "1111" },
];

async function sembrarUsuarios() {
  if ((await db.usuarios.count()) > 0) return;
  let patero: string | null = null;
  for (const u of USUARIOS_DEMO) {
    const r = await crearUsuario({
      ...u,
      ordenSecciones: u.rol === "patero" ? ["C", "B", "A", "PN", "E1", "E2", "OF"] : [],
    });
    if (r.ok && u.rol === "patero") patero = r.usuario.id;
  }
  // la demostración abre ya como patero, que es quien trabaja en el patio
  if (patero) await abrirSesion(patero);
}

export async function reiniciarDemo(ahora = Date.now()) {
  await db.transaction("rw", db.tables, async () => {
    for (const t of db.tables) await t.clear();
  });
  await sembrarUsuarios();
  await sembrar(ahora);
}
