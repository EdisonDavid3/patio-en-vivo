/**
 * LA ÚNICA CAPA DE DATOS.
 * Las pantallas nunca tocan Dexie ni (mañana) Supabase: todo pasa por aquí.
 * El día que la empresa ponga su PostgreSQL se cambia este archivo y nada más.
 */
import { db } from "./db";
import { ZONAS, TODAS_POSICIONES } from "./zonas";
import type { Estadia, EstadoPosicion, Lectura, Posicion, Usuario, Zona } from "./tipos";
import type { Codigo } from "../dominio/temperatura";
import { entraEnRonda, ETAPAS, type Etapa } from "../dominio/etapas";
import { diaOperativo, HORAS_FIJAS, ranuraParaGuardar, ranurasDelDia, VENTANA_MIN_POR_DEFECTO } from "../dominio/tiempo";
import { normalizar } from "../dominio/iso6346";

export const USUARIO_DEMO = "u-danilo";
const DISPOSITIVO = "demo";

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

async function anotar(tipo: string, carga: unknown) {
  await db.eventos.add({
    id: uid(), tipo, carga, usuarioId: USUARIO_DEMO,
    dispositivoId: DISPOSITIVO, creadoMs: Date.now(), enviadoMs: null,
  });
}

/* ---------- ronda ---------- */

export type Ronda = { dia: string; indice: number; horaFija: number; ms: number };

/** La ronda en curso: la última hora fija que ya pasó. */
export function rondaActual(ahora = Date.now()): Ronda {
  for (let saltoDias = 0; saltoDias < 2; saltoDias++) {
    const dia = diaOperativo(ahora - saltoDias * 86_400_000);
    const ranuras = ranurasDelDia(dia);
    for (let i = ranuras.length - 1; i >= 0; i--) {
      if (ranuras[i]! <= ahora) return { dia, indice: i, horaFija: HORAS_FIJAS[i]!, ms: ranuras[i]! };
    }
  }
  const dia = diaOperativo(ahora);
  return { dia, indice: 0, horaFija: 8, ms: ranurasDelDia(dia)[0]! };
}

/* ---------- lectura del estado ---------- */

export async function zonas(): Promise<Zona[]> {
  const z = await db.zonas.orderBy("orden").toArray();
  return z.length ? z : ZONAS;
}

export async function posiciones(): Promise<Posicion[]> {
  const p = await db.posiciones.toArray();
  const lista = p.length ? p : TODAS_POSICIONES;
  // IndexedDB las devuelve ordenadas como texto (C-1, C-10, C-11, C-2...).
  // En el patio importan el orden de las zonas y el número, no el alfabeto.
  const ordenZona = new Map(ZONAS.map((z, i) => [z.id, i]));
  return [...lista].sort(
    (a, b) =>
      (ordenZona.get(a.zonaId) ?? 99) - (ordenZona.get(b.zonaId) ?? 99) ||
      a.numero - b.numero,
  );
}

export type VistaPatio = {
  ronda: Ronda;
  porPosicion: Map<string, EstadoPosicion>;
  lista: EstadoPosicion[];
};

/** Todo lo que las pantallas del patio necesitan, en una sola pasada. */
export async function vistaPatio(ahora = Date.now()): Promise<VistaPatio> {
  const [zs, ps, abiertas, estadias, lecturas] = await Promise.all([
    zonas(),
    posiciones(),
    db.ubicaciones.filter((u) => u.hasta === null).toArray(),
    db.estadias.filter((e) => e.salida === null).toArray(),
    db.lecturas.orderBy("tomadaMs").toArray(),
  ]);
  const ronda = rondaActual(ahora);
  const zonaPorId = new Map(zs.map((z) => [z.id, z]));
  const estadiaPorId = new Map(estadias.map((e) => [e.id, e]));

  const porEstadia = new Map<string, Lectura[]>();
  for (const l of lecturas) {
    const arr = porEstadia.get(l.estadiaId);
    if (arr) arr.push(l);
    else porEstadia.set(l.estadiaId, [l]);
  }

  const estadiaEnPosicion = new Map<string, Estadia>();
  for (const u of abiertas) {
    const e = estadiaPorId.get(u.estadiaId);
    if (e) estadiaEnPosicion.set(u.posicionId, e);
  }

  const lista: EstadoPosicion[] = [];
  const porPosicion = new Map<string, EstadoPosicion>();
  for (const p of ps) {
    const zona = zonaPorId.get(p.zonaId)!;
    const estadia = estadiaEnPosicion.get(p.id) ?? null;
    const ls = estadia ? (porEstadia.get(estadia.id) ?? []) : [];
    const ultima = ls.length ? ls[ls.length - 1]! : null;
    const anterior = ls.length > 1 ? ls[ls.length - 2]! : null;
    const medidaEnRonda = ls.some((l) => l.dia === ronda.dia && l.indice === ronda.indice);
    const etapa = estadia?.etapa ?? null;
    // D25: solo entran en la ronda y en los contadores las etapas que exigen temperatura
    const cuentaEnRonda = etapa !== null && entraEnRonda(etapa) && !estadia!.suspendido;
    const est: EstadoPosicion = {
      posicion: p, zona, estadia, ultima, anterior, medidaEnRonda, etapa, cuentaEnRonda,
    };
    lista.push(est);
    porPosicion.set(p.id, est);
  }
  return { ronda, porPosicion, lista };
}

/* ---------- escritura ---------- */

export async function registrarLlegada(args: {
  posicionId: string; numero: string; temperaturaC?: number;
  conAdvertencia?: boolean; producto?: string; sello?: string; estado?: string;
  etapa?: Etapa; ahora?: number;
}): Promise<{ ok: true; estadiaId: string } | { ok: false; error: string }> {
  const ahora = args.ahora ?? Date.now();
  const numero = normalizar(args.numero);

  const yaEsta = await db.estadias.filter((e) => e.salida === null && e.numero === numero).first();
  if (yaEsta) {
    const u = await db.ubicaciones.filter((x) => x.estadiaId === yaEsta.id && x.hasta === null).first();
    return { ok: false, error: `Ese contenedor ya está en el patio, en ${u?.posicionId.replace("-", " ") ?? "otra posición"}.` };
  }
  const ocupada = await db.ubicaciones.filter((u) => u.hasta === null && u.posicionId === args.posicionId).first();
  if (ocupada) return { ok: false, error: "Esa posición ya está ocupada." };

  const estadiaId = uid();
  // D26: el contenedor llega VACÍO. La temperatura de llegada es opcional.
  const etapa: Etapa = args.etapa ?? "vacio";
  await db.transaction("rw",
    [db.contenedores, db.estadias, db.ubicaciones, db.tramosEtapa, db.lecturas, db.eventos],
    async () => {
      await db.contenedores.put({ numero, prefijo: numero.slice(0, 4), extra: {} });
      await db.estadias.add({
        id: estadiaId, numero, entrada: ahora, salida: null,
        producto: args.producto ?? "", sello: args.sello ?? "", estado: args.estado ?? "",
        conAdvertencia: args.conAdvertencia ?? false, suspendido: null, etapa, nota: "",
      });
      await db.ubicaciones.add({ id: uid(), estadiaId, posicionId: args.posicionId, desde: ahora, hasta: null });
      await db.tramosEtapa.add({ id: uid(), estadiaId, etapa, desde: ahora, hasta: null, usuarioId: USUARIO_DEMO });
      if (args.temperaturaC !== undefined) {
        await guardarLecturaInterna(estadiaId, args.posicionId, numero, args.temperaturaC, null, ahora);
      }
      await anotar("llegada", { estadiaId, posicionId: args.posicionId, numero, etapa });
    });
  return { ok: true, estadiaId };
}

async function guardarLecturaInterna(
  estadiaId: string, posicionId: string, numero: string,
  c: number | null, codigo: Codigo | null, ms: number, nota = "", ranura?: Ronda,
) {
  // Si viene de una ronda, manda la ronda que el patero tiene abierta en la pantalla.
  const a = ranura
    ? { dia: ranura.dia, indice: ranura.indice, horaFija: ranura.horaFija,
        atrasada: Math.abs(ms - ranura.ms) > VENTANA_MIN_POR_DEFECTO * 60_000 }
    : ranuraParaGuardar(ms);
  await db.lecturas.add({
    id: uid(), estadiaId, posicionId, numero, tomadaMs: ms,
    dia: a.dia, indice: a.indice, horaFija: a.horaFija,
    c, codigo, atrasada: a.atrasada, usuarioId: USUARIO_DEMO, nota,
  });
}

export async function guardarLectura(args: {
  estadiaId: string; posicionId: string; numero: string;
  temperaturaC?: number; codigo?: Codigo; nota?: string; ahora?: number; ranura?: Ronda;
}) {
  const ahora = args.ahora ?? Date.now();
  await db.transaction("rw", db.lecturas, db.eventos, async () => {
    await guardarLecturaInterna(
      args.estadiaId, args.posicionId, args.numero,
      args.temperaturaC ?? null, args.codigo ?? null, ahora, args.nota ?? "", args.ranura,
    );
    await anotar("lectura", { estadiaId: args.estadiaId, c: args.temperaturaC ?? null, codigo: args.codigo ?? null });
  });
}

/** Mover NO reinicia el tiempo en patio: cierra el tramo y abre otro. */
export async function mover(estadiaId: string, aPosicionId: string, ahora = Date.now()) {
  const ocupada = await db.ubicaciones.filter((u) => u.hasta === null && u.posicionId === aPosicionId).first();
  if (ocupada) return { ok: false as const, error: "Esa posición ya está ocupada." };
  await db.transaction("rw", db.ubicaciones, db.eventos, async () => {
    const actual = await db.ubicaciones.filter((u) => u.estadiaId === estadiaId && u.hasta === null).first();
    if (actual) await db.ubicaciones.update(actual.id, { hasta: ahora });
    await db.ubicaciones.add({ id: uid(), estadiaId, posicionId: aPosicionId, desde: ahora, hasta: null });
    await anotar("mover", { estadiaId, de: actual?.posicionId ?? null, a: aPosicionId });
  });
  return { ok: true as const };
}

/**
 * D27: al reportar la salida el contenedor DESAPARECE del patio en vivo de inmediato
 * (plano, mini-plano, listas, ronda y contadores) y la posición queda libre.
 * No se borra de nada: sigue en el historial, en la búsqueda y en los reportes.
 */
export async function reportarSalida(estadiaId: string, ahora = Date.now()) {
  await db.transaction("rw", [db.estadias, db.ubicaciones, db.tramosEtapa, db.eventos], async () => {
    const antes = await db.estadias.get(estadiaId);
    await db.estadias.update(estadiaId, { salida: ahora, etapa: "despachado" });
    const actual = await db.ubicaciones.filter((u) => u.estadiaId === estadiaId && u.hasta === null).first();
    if (actual) await db.ubicaciones.update(actual.id, { hasta: ahora });
    await cerrarYAbrirTramo(estadiaId, "despachado", ahora);
    await anotar("salida", { estadiaId, etapaAntes: antes?.etapa ?? null, posicion: actual?.posicionId ?? null });
  });
}

/** Deshacer la salida: vuelve a abrir la estadía en la misma posición y etapa. */
export async function deshacerSalida(estadiaId: string) {
  await db.transaction("rw", [db.estadias, db.ubicaciones, db.tramosEtapa, db.eventos], async () => {
    const e = await db.estadias.get(estadiaId);
    if (!e || e.salida === null) return;
    const ultimo = (await db.ubicaciones.filter((u) => u.estadiaId === estadiaId).toArray())
      .sort((a, b) => a.desde - b.desde).at(-1);
    const previos = (await db.tramosEtapa.filter((t) => t.estadiaId === estadiaId).toArray())
      .sort((a, b) => a.desde - b.desde);
    const despachado = previos.at(-1);
    const anterior = previos.at(-2);
    if (despachado?.etapa === "despachado") await db.tramosEtapa.delete(despachado.id);
    if (anterior) await db.tramosEtapa.update(anterior.id, { hasta: null });
    await db.estadias.update(estadiaId, { salida: null, etapa: anterior?.etapa ?? "con_producto" });
    if (ultimo) await db.ubicaciones.update(ultimo.id, { hasta: null });
    await anotar("deshacer-salida", { estadiaId });
  });
}

/* ---------- etapas del contenedor ---------- */

/** La única cámara de carga del patio. */
export const CAMARA_CARGA = "E2";

async function cerrarYAbrirTramo(estadiaId: string, etapa: Etapa, ahora: number) {
  const abierto = await db.tramosEtapa.filter((t) => t.estadiaId === estadiaId && t.hasta === null).first();
  if (abierto) {
    if (abierto.etapa === etapa) return;
    await db.tramosEtapa.update(abierto.id, { hasta: ahora });
  }
  await db.tramosEtapa.add({ id: uid(), estadiaId, etapa, desde: ahora, hasta: null, usuarioId: USUARIO_DEMO });
}

export async function cambiarEtapa(estadiaId: string, etapa: Etapa, ahora = Date.now()) {
  await db.transaction("rw", [db.estadias, db.tramosEtapa, db.eventos], async () => {
    const antes = await db.estadias.get(estadiaId);
    if (!antes || antes.etapa === etapa) return;
    await db.estadias.update(estadiaId, { etapa });
    await cerrarYAbrirTramo(estadiaId, etapa, ahora);
    await anotar("cambio-etapa", { estadiaId, de: antes.etapa, a: etapa });
  });
}

/** Pasar a Cámara 3 y 4: mueve el contenedor y lo pone a cargar, en un solo paso. */
export async function pasarACamara(estadiaId: string, posicionId: string, ahora = Date.now()) {
  if (!posicionId.startsWith(CAMARA_CARGA + "-")) {
    return { ok: false as const, error: "Esa posición no es de Cámara 3 y 4." };
  }
  const res = await mover(estadiaId, posicionId, ahora);
  if (!res.ok) return res;
  await cambiarEtapa(estadiaId, "cargando", ahora);
  return { ok: true as const };
}

/**
 * Sacar de la cámara. Si ya tiene producto, empieza la vigilancia con alertas;
 * si no, vuelve a enfriando.
 */
export async function sacarDeCamara(
  estadiaId: string, posicionId: string, conProducto: boolean, ahora = Date.now(),
) {
  const res = await mover(estadiaId, posicionId, ahora);
  if (!res.ok) return res;
  await cambiarEtapa(estadiaId, conProducto ? "con_producto" : "enfriando", ahora);
  return { ok: true as const };
}

export async function tramosEtapaDe(estadiaId: string) {
  const t = await db.tramosEtapa.filter((x) => x.estadiaId === estadiaId).toArray();
  return t.sort((a, b) => a.desde - b.desde);
}

/** Cuánto tiempo pasó la estadía en cada etapa. Para el historial y el reporte de tiempo en patio. */
export async function tiempoPorEtapa(estadiaId: string, ahora = Date.now()): Promise<Record<Etapa, number>> {
  const t = await tramosEtapaDe(estadiaId);
  const out = { vacio: 0, enfriando: 0, cargando: 0, con_producto: 0, despachado: 0 } as Record<Etapa, number>;
  for (const x of t) out[x.etapa] += Math.max(0, (x.hasta ?? ahora) - x.desde);
  return out;
}

/** La posición anterior de la estadía, si sigue libre: para «Volver a su posición anterior». */
export async function posicionAnteriorLibre(estadiaId: string): Promise<string | null> {
  const us = await ubicacionesDe(estadiaId);
  const previa = us.at(-2);
  if (!previa) return null;
  const ocupada = await db.ubicaciones.filter((u) => u.hasta === null && u.posicionId === previa.posicionId).first();
  return ocupada ? null : previa.posicionId;
}

export async function corregirEstadia(estadiaId: string, cambios: Partial<Estadia>) {
  const antes = await db.estadias.get(estadiaId);
  await db.transaction("rw", db.estadias, db.eventos, async () => {
    await db.estadias.update(estadiaId, cambios);
    await anotar("corregir-estadia", { estadiaId, antes, cambios });
  });
}

export async function corregirLectura(lecturaId: string, c: number | null, codigo: Codigo | null) {
  const antes = await db.lecturas.get(lecturaId);
  await db.transaction("rw", db.lecturas, db.eventos, async () => {
    await db.lecturas.update(lecturaId, { c, codigo });
    await anotar("corregir-lectura", { lecturaId, antes, c, codigo });
  });
}

/* ---------- consultas ---------- */

export async function lecturasDe(estadiaId: string): Promise<Lectura[]> {
  const ls = await db.lecturas.filter((l) => l.estadiaId === estadiaId).toArray();
  return ls.sort((a, b) => a.tomadaMs - b.tomadaMs);
}

export async function ubicacionesDe(estadiaId: string) {
  const us = await db.ubicaciones.filter((u) => u.estadiaId === estadiaId).toArray();
  return us.sort((a, b) => a.desde - b.desde);
}

export type Hallazgo = { estadia: Estadia; posicionId: string | null; enPatio: boolean };

/** Buscar por los últimos dígitos, como los nombran en el patio. */
export async function buscar(texto: string): Promise<Hallazgo[]> {
  const t = normalizar(texto);
  if (t.length < 2) return [];
  const estadias = await db.estadias.filter((e) => e.numero.includes(t)).toArray();
  const ubis = await db.ubicaciones.filter((u) => u.hasta === null).toArray();
  const posPorEstadia = new Map(ubis.map((u) => [u.estadiaId, u.posicionId]));
  return estadias
    .sort((a, b) => Number(b.salida === null) - Number(a.salida === null) || b.entrada - a.entrada)
    .map((e) => ({ estadia: e, posicionId: posPorEstadia.get(e.id) ?? null, enPatio: e.salida === null }));
}

export async function usuario(): Promise<Usuario> {
  const u = await db.usuarios.get(USUARIO_DEMO);
  return u ?? { id: USUARIO_DEMO, nombre: "Danilo Zambrano", rol: "patero", ordenSecciones: [], activo: true };
}

/** D17: la app recuerda el orden de secciones que suele seguir cada patero. */
export async function recordarSeccion(zonaId: string) {
  const u = await usuario();
  const orden = [zonaId, ...u.ordenSecciones.filter((z) => z !== zonaId)].slice(0, 7);
  await db.usuarios.put({ ...u, ordenSecciones: orden });
}

export async function pendientesDeEnvio(): Promise<number> {
  return db.eventos.filter((e) => e.enviadoMs === null).count();
}

/* ---------- reporte oficial ---------- */

import type { Celda } from "../dominio/calculos";
import { resumen } from "../dominio/calculos";

export type FilaReporte = {
  estadiaId: string;
  numero: string;
  ubicacion: string;
  producto: string;
  sello: string;
  estado: string;
  ingreso: number | null;
  salida: number | null;
  celdas: Celda[];
  resumen: { min: number; max: number; prom: number } | null;
};

export type Reporte = {
  dia: string;
  filas: FilaReporte[];
  observaciones: { ms: number; texto: string }[];
  responsables: { dia: string; noche: string };
};

const ORDEN_ZONAS = ["E1", "E2", "C", "B", "OF", "A", "PN"];
function ordenPosicion(id: string): number {
  const [z, n] = id.split("-");
  const i = ORDEN_ZONAS.indexOf(z ?? "");
  return (i < 0 ? 99 : i) * 1000 + Number(n ?? 0);
}

/** Arma la hoja oficial de un día operativo: una columna por contenedor, 12 filas de hora. */
export async function armarReporte(dia: string): Promise<Reporte> {
  const ranuras = ranurasDelDia(dia);
  const inicio = ranuras[0]!;
  const fin = ranuras[11]!;

  const [estadias, ubicaciones, lecturas, u] = await Promise.all([
    db.estadias.toArray(),
    db.ubicaciones.toArray(),
    db.lecturas.filter((l) => l.dia === dia).toArray(),
    usuario(),
  ]);

  // estuvo en el patio en algún momento del día operativo
  const presentes = estadias.filter(
    (e) => e.entrada <= fin && (e.salida === null || e.salida >= inicio),
  );

  const porEstadia = new Map<string, typeof lecturas>();
  for (const l of lecturas) {
    const a = porEstadia.get(l.estadiaId);
    if (a) a.push(l); else porEstadia.set(l.estadiaId, [l]);
  }

  const filas: FilaReporte[] = presentes.map((e) => {
    const tramos = ubicaciones
      .filter((x) => x.estadiaId === e.id && x.desde <= fin && (x.hasta === null || x.hasta >= inicio))
      .sort((a, b) => a.desde - b.desde);
    const posicionId = tramos.at(-1)?.posicionId ?? "";
    const ls = porEstadia.get(e.id) ?? [];
    const celdas: Celda[] = Array.from({ length: 12 }, (_, i) => {
      const l = ls.find((x) => x.indice === i);
      if (!l) return null;
      if (l.c !== null) return { c: l.c };
      if (l.codigo) return { codigo: l.codigo };
      return null;
    });
    return {
      estadiaId: e.id,
      numero: e.numero,
      ubicacion: posicionId.replace("-", " "),
      producto: e.producto,
      sello: e.sello,
      estado: e.estado,
      ingreso: e.entrada >= inicio && e.entrada <= fin ? e.entrada : null,
      salida: e.salida !== null && e.salida >= inicio && e.salida <= fin ? e.salida : null,
      celdas,
      resumen: resumen(celdas),
    };
  });

  filas.sort((a, b) => ordenPosicion(a.ubicacion.replace(" ", "-")) - ordenPosicion(b.ubicacion.replace(" ", "-")));

  // observaciones del día: lo que se salió de rango y lo que no se pudo medir
  const observaciones: { ms: number; texto: string }[] = [];
  for (const l of lecturas) {
    const pos = l.posicionId.replace("-", " ");
    if (l.codigo) {
      const nombre = { C: "cargando", D: "despachado", E: "en espera", SE: "sin energía", V: "vacío" }[l.codigo];
      observaciones.push({ ms: l.tomadaMs, texto: `${pos} · ${nombre} al momento de la toma.` });
    } else if (l.c !== null && l.c > -15) {
      observaciones.push({ ms: l.tomadaMs, texto: `${pos} · marcó ${l.c.toFixed(1)} °C, fuera de rango. Se avisó a mantenimiento.` });
    }
  }
  for (const f of filas) {
    f.celdas.forEach((c, i) => {
      if (c === null && ranuras[i]! <= Date.now() && (f.ingreso === null || f.ingreso <= ranuras[i]!)) {
        observaciones.push({ ms: ranuras[i]!, texto: `${f.ubicacion} · sin lectura en la toma de las ${HORAS_FIJAS[i]}:00.` });
      }
    });
  }
  observaciones.sort((a, b) => a.ms - b.ms);

  return {
    dia,
    filas,
    observaciones: observaciones.slice(0, 8),
    responsables: { dia: u.nombre, noche: "Luis Mendoza" },
  };
}

/** Días operativos que tienen lecturas, del más nuevo al más viejo. */
export async function diasConDatos(): Promise<string[]> {
  const ls = await db.lecturas.orderBy("tomadaMs").toArray();
  return [...new Set(ls.map((l) => l.dia))].sort().reverse();
}

/**
 * Guarda la lectura de la ronda en curso. Si el patero volvió atrás y ya había
 * una lectura en esa hora fija, la corrige en vez de duplicarla: el formato
 * oficial tiene una sola celda por hora.
 */
export async function guardarLecturaDeRonda(args: {
  estadiaId: string; posicionId: string; numero: string;
  temperaturaC?: number; codigo?: Codigo; nota?: string; ahora?: number;
}) {
  const ahora = args.ahora ?? Date.now();
  const r = rondaActual(ahora);
  const previa = await db.lecturas
    .filter((l) => l.estadiaId === args.estadiaId && l.dia === r.dia && l.indice === r.indice)
    .first();
  if (previa) {
    await corregirLectura(previa.id, args.temperaturaC ?? null, args.codigo ?? null);
    return;
  }
  await guardarLectura({ ...args, ranura: r });
}
