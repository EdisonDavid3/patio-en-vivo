/**
 * Datos de demostración para la Fase 0. Todo ficticio, con números de contenedor
 * que sí cumplen ISO 6346. No hay un solo dato real de la empresa.
 */
import { db } from "./db";
import { ZONAS, TODAS_POSICIONES } from "./zonas";
import { digitoVerificador } from "../dominio/iso6346";
import { diaOperativo, ranurasDelDia, HORAS_FIJAS } from "../dominio/tiempo";
import { rondaActual, USUARIO_DEMO } from "./repo";
import type { Estadia, Lectura, Ubicacion } from "./tipos";

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
  if ((await db.estadias.count()) > 0) return;
  await sembrar(ahora);
}

export async function sembrar(ahora = Date.now()): Promise<void> {
  const r = azar(20261114);
  const ronda = rondaActual(ahora);
  const usados = new Set<string>();

  const libres = [...TODAS_POSICIONES];
  // 52 ocupadas de 115, repartidas por todo el patio
  const cupos: Record<string, number> = { E1: 5, E2: 6, C: 14, B: 8, OF: 2, A: 15, PN: 2 };
  const elegidas: string[] = [];
  for (const z of ZONAS) {
    const dela = libres.filter((p) => p.zonaId === z.id);
    const mezcla = dela.map((p) => ({ p, k: r() })).sort((a, b) => a.k - b.k).map((x) => x.p);
    elegidas.push(...mezcla.slice(0, cupos[z.id] ?? 0).map((p) => p.id));
  }

  const estadias: Estadia[] = [];
  const ubicaciones: Ubicacion[] = [];
  const lecturas: Lectura[] = [];
  let n = 0;

  // De las 52, 15 quedan sin tomar en la ronda en curso
  const sinTomar = new Set(
    elegidas.map((id) => ({ id, k: r() })).sort((a, b) => a.k - b.k).slice(0, 15).map((x) => x.id),
  );

  for (const posicionId of elegidas) {
    n++;
    const numero = numeroValido(r, usados);
    const id = `e-${n}`;
    const diasAtras = 1 + Math.floor(r() * 4);
    const entrada = ahora - diasAtras * 86_400_000 - Math.floor(r() * 10) * 3600_000;

    // temperatura de base: casi todo correcto, algunos en urgencia, pocos en alerta
    const d = r();
    const base = d < 0.84 ? -22.4 + r() * 4 : d < 0.95 ? -17.9 + r() * 2.7 : -14.9 + r() * 2.4;

    estadias.push({
      id, numero, entrada, salida: null,
      producto: PRODUCTOS[Math.floor(r() * PRODUCTOS.length)]!,
      sello: "EC" + String(Math.floor(r() * 900000) + 100000),
      estado: ESTADOS[Math.floor(r() * ESTADOS.length)]!,
      conAdvertencia: n === 7, suspendido: null, nota: "",
    });

    // una de cada seis pasó antes por otra posición: mover no reinicia el tiempo en patio
    if (n % 6 === 0) {
      const previa = libres.find((p) => !elegidas.includes(p.id) && p.zonaId === "PN")?.id;
      const corte = entrada + 12 * 3600_000;
      if (previa && corte < ahora) {
        ubicaciones.push({ id: `u-${n}a`, estadiaId: id, posicionId: previa, desde: entrada, hasta: corte });
        ubicaciones.push({ id: `u-${n}b`, estadiaId: id, posicionId, desde: corte, hasta: null });
      } else {
        ubicaciones.push({ id: `u-${n}`, estadiaId: id, posicionId, desde: entrada, hasta: null });
      }
    } else {
      ubicaciones.push({ id: `u-${n}`, estadiaId: id, posicionId, desde: entrada, hasta: null });
    }

    // lecturas de las últimas 44 horas, en cada hora fija
    const desde = Math.max(entrada, ahora - 44 * 3600_000);
    let i = 0;
    for (const ranura of ranurasEntre(desde, ronda.ms)) {
      i++;
      const ultima = ranura.dia === ronda.dia && ranura.indice === ronda.indice;
      if (ultima && sinTomar.has(posicionId)) continue;
      const c = Math.round((base + (r() - 0.5) * 1.3) * 10) / 10;
      const desfase = Math.floor(r() * 44) - 4;
      // un contenedor sin energía al momento de la toma (D3)
      const codigo = n === 11 && ultima ? ("SE" as const) : null;
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
    conAdvertencia: false, suspendido: null, nota: "Despachado al buque.",
  });
  ubicaciones.push({
    id: "u-salido", estadiaId: "e-salido", posicionId: "PN-20",
    desde: ahora - 6 * 86_400_000, hasta: ahora - 2 * 86_400_000,
  });

  await db.transaction("rw",
    [db.zonas, db.posiciones, db.contenedores, db.estadias, db.ubicaciones, db.lecturas, db.usuarios, db.ajustes],
    async () => {
      await db.zonas.bulkPut(ZONAS);
      await db.posiciones.bulkPut(TODAS_POSICIONES);
      await db.contenedores.bulkPut(
        estadias.map((e) => ({ numero: e.numero, prefijo: e.numero.slice(0, 4), extra: {} })),
      );
      await db.estadias.bulkPut(estadias);
      await db.ubicaciones.bulkPut(ubicaciones);
      await db.lecturas.bulkPut(lecturas);
      await db.usuarios.put({
        id: USUARIO_DEMO, nombre: "Danilo Zambrano", rol: "patero",
        ordenSecciones: ["C", "B", "A", "PN", "E1", "E2", "OF"], activo: true,
      });
      await db.ajustes.bulkPut([
        { clave: "modo", valor: "demo" },
        { clave: "sembradoMs", valor: ahora },
      ]);
    });
}

export async function reiniciarDemo(ahora = Date.now()) {
  await db.transaction("rw", db.tables, async () => {
    for (const t of db.tables) await t.clear();
  });
  await sembrar(ahora);
}
