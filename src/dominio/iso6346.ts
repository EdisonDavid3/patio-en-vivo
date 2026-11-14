/** Validación del número de contenedor según ISO 6346. */

const VALOR_LETRA: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  let v = 10;
  for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
    while (v % 11 === 0) v++;
    m[ch] = v++;
  }
  return m;
})();

export const RE_COMPLETO = /^[A-Z]{4}\d{7}$/;

export type ResultadoISO =
  | { ok: true; numero: string }
  | { ok: false; motivo: "formato"; mensaje: string }
  | { ok: false; motivo: "verificador"; mensaje: string; esperado: number; numero: string };

/** Dígito verificador que le corresponde a los primeros 10 caracteres. */
export function digitoVerificador(diez: string): number {
  const s = diez.toUpperCase();
  if (!/^[A-Z]{4}\d{6}$/.test(s)) throw new Error("Se esperaban 4 letras y 6 dígitos");
  let suma = 0;
  for (let i = 0; i < 10; i++) {
    const c = s[i]!;
    const valor = c >= "A" && c <= "Z" ? VALOR_LETRA[c]! : Number(c);
    suma += valor * 2 ** i;
  }
  return (suma % 11) % 10;
}

export function normalizar(texto: string): string {
  return texto.replace(/[\s-]/g, "").toUpperCase();
}

/**
 * D1: los 11 caracteres son obligatorios siempre.
 * D2: si el dígito verificador no cuadra se avisa, pero se puede guardar con advertencia.
 */
export function validar(texto: string): ResultadoISO {
  const n = normalizar(texto);
  if (!RE_COMPLETO.test(n)) {
    return {
      ok: false,
      motivo: "formato",
      mensaje: "El número debe tener 4 letras y 7 números, sin espacios. Ejemplo: MSCU1281608.",
    };
  }
  const esperado = digitoVerificador(n.slice(0, 10));
  const tiene = Number(n[10]);
  if (tiene !== esperado) {
    return {
      ok: false,
      motivo: "verificador",
      numero: n,
      esperado,
      mensaje: `El último número no cuadra: debería terminar en ${esperado}, no en ${tiene}. Revisa la placa del contenedor.`,
    };
  }
  return { ok: true, numero: n };
}

/** Para mostrarlo separado: MSCU 128160 8 */
export function formatear(numero: string): string {
  if (!RE_COMPLETO.test(numero)) return numero;
  return `${numero.slice(0, 4)} ${numero.slice(4, 10)} ${numero.slice(10)}`;
}
