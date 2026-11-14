import { partesNumero } from "../util";

/** El contenedor es el protagonista: número grande y los cuatro dígitos del patio resaltados. */
export function Numero({ numero, tamano = "normal" }: { numero: string; tamano?: "normal" | "grande" | "chico" }) {
  const p = partesNumero(numero);
  return (
    <span className={"numc " + tamano}>
      {p.antes}
      <b>{p.clave}</b>
      {p.despues}
    </span>
  );
}
