/**
 * Usuarios, PIN y sesión. Todo dentro del aparato.
 *
 * El PIN se guarda como huella, nunca en claro. Aun así, en la Fase 0 esto NO es
 * seguridad: sin servidor, cualquiera podría crearse un administrador en su propio
 * teléfono. Sirve para que cada quien vea lo suyo y no se equivoque de botón.
 */
import { db } from "./db";
import type { Usuario } from "./tipos";
import { largoPin, type Rol } from "../dominio/permisos";

const CLAVE_SESION = "sesion";

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `u-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function aHex(b: ArrayBuffer): string {
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function huella(pin: string, sal: string): Promise<string> {
  const datos = new TextEncoder().encode(`patio-en-vivo:${sal}:${pin}`);
  return aHex(await crypto.subtle.digest("SHA-256", datos));
}

function salNueva(): string {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return aHex(b.buffer);
}

export type ResultadoEntrada =
  | { ok: true; usuario: Usuario }
  | { ok: false; error: string };

export async function crearUsuario(args: {
  nombre: string; rol: Rol; pin: string; ordenSecciones?: string[];
}): Promise<ResultadoEntrada> {
  const nombre = args.nombre.trim();
  if (nombre.length < 3) return { ok: false, error: "Escribe tu nombre completo." };
  const largo = largoPin(args.rol);
  if (!new RegExp(`^\\d{${largo}}$`).test(args.pin)) {
    return { ok: false, error: `El PIN debe ser de ${largo} números.` };
  }
  const repetido = await db.usuarios.filter((u) => u.nombre.toLowerCase() === nombre.toLowerCase()).first();
  if (repetido) return { ok: false, error: "Ya hay alguien registrado con ese nombre." };

  const sal = salNueva();
  const usuario: Usuario = {
    id: uid(), nombre, rol: args.rol,
    ordenSecciones: args.ordenSecciones ?? [],
    activo: true, sal, huellaPin: await huella(args.pin, sal), creadoMs: Date.now(),
  };
  await db.usuarios.add(usuario);
  return { ok: true, usuario };
}

export async function comprobarPin(usuarioId: string, pin: string): Promise<ResultadoEntrada> {
  const u = await db.usuarios.get(usuarioId);
  if (!u) return { ok: false, error: "Ese usuario ya no existe." };
  if (!u.activo) return { ok: false, error: "Ese usuario está desactivado. Habla con el administrador." };
  if ((await huella(pin, u.sal)) !== u.huellaPin) return { ok: false, error: "El PIN no es correcto." };
  return { ok: true, usuario: u };
}

export async function cambiarPin(usuarioId: string, pin: string): Promise<ResultadoEntrada> {
  const u = await db.usuarios.get(usuarioId);
  if (!u) return { ok: false, error: "Ese usuario ya no existe." };
  const largo = largoPin(u.rol);
  if (!new RegExp(`^\\d{${largo}}$`).test(pin)) {
    return { ok: false, error: `El PIN debe ser de ${largo} números.` };
  }
  const sal = salNueva();
  await db.usuarios.update(usuarioId, { sal, huellaPin: await huella(pin, sal) });
  return { ok: true, usuario: { ...u, sal } };
}

export async function cambiarRol(usuarioId: string, rol: Rol, pin?: string): Promise<ResultadoEntrada> {
  const u = await db.usuarios.get(usuarioId);
  if (!u) return { ok: false, error: "Ese usuario ya no existe." };
  // el administrador lleva un PIN más largo, así que al subir de rol hay que ponerlo de nuevo
  if (largoPin(rol) !== largoPin(u.rol)) {
    if (!pin) return { ok: false, error: `Pon un PIN de ${largoPin(rol)} números para ese rol.` };
    const sal = salNueva();
    await db.usuarios.update(usuarioId, { rol, sal, huellaPin: await huella(pin, sal) });
    return { ok: true, usuario: { ...u, rol } };
  }
  await db.usuarios.update(usuarioId, { rol });
  return { ok: true, usuario: { ...u, rol } };
}

export async function activarUsuario(usuarioId: string, activo: boolean) {
  await db.usuarios.update(usuarioId, { activo });
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const us = await db.usuarios.toArray();
  return us.sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre, "es"));
}

/* ---------- sesión ---------- */

export async function abrirSesion(usuarioId: string) {
  await db.ajustes.put({ clave: CLAVE_SESION, valor: usuarioId });
}

export async function cerrarSesion() {
  await db.ajustes.delete(CLAVE_SESION);
}

/** El usuario que está usando este aparato, o null si hay que entrar. */
export async function sesion(): Promise<Usuario | null> {
  const a = await db.ajustes.get(CLAVE_SESION);
  if (!a || typeof a.valor !== "string") return null;
  const u = await db.usuarios.get(a.valor);
  if (!u || !u.activo) return null;
  return u;
}

export async function hayUsuarios(): Promise<boolean> {
  return (await db.usuarios.count()) > 0;
}
