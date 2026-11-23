import { useState } from "react";
import { Teclado } from "./Teclado";
import { aNumero, mostrarValor } from "../util";
import { ETIQUETA, ICONO, esImprobable, formatearC, rango } from "../../dominio/temperatura";

/** Hoja con el teclado numérico. El signo menos ya viene puesto. */
export function HojaTemperatura({ titulo, texto, inicial, permitirSin, onGuardar, onCerrar }: {
  titulo: string;
  texto: string;
  inicial: number | null;
  /** Deja salir sin poner temperatura (en la llegada es opcional). */
  permitirSin?: boolean;
  onGuardar: (t: number | null) => void;
  onCerrar: () => void;
}) {
  const [valor, setValor] = useState(inicial === null ? "" : String(Math.abs(inicial)).replace(".", ","));
  const [negativo, setNegativo] = useState(inicial === null ? true : inicial < 0);
  const [confirmar, setConfirmar] = useState(false);
  const n = aNumero(valor, negativo);
  const r = n === null ? null : rango(n);

  return (
    <div className="velo" onClick={onCerrar}>
      <div className="hoja" onClick={(e) => e.stopPropagation()}>
        <h2>{titulo}</h2>
        <p>{texto}</p>
        <div className={"mini-lector " + (r ?? "")}>
          <span className="v">{mostrarValor(valor, negativo)}</span>
          <span className="u">°C</span>
          {valor && (
            <button type="button" onClick={() => setValor(valor.slice(0, -1))}
              style={{ background: "none", border: 0, fontSize: 16, color: "var(--tinta3)" }} aria-label="Borrar">⌫</button>
          )}
          <span className="e">{r ? `${ICONO[r]} ${ETIQUETA[r]}` : ""}</span>
        </div>
        <Teclado valor={valor} onValor={setValor} negativo={negativo} onSigno={() => setNegativo((x) => !x)} />
        {confirmar && n !== null && (
          <div className="aviso"><b>¿{formatearC(n)} °C es correcto?</b>
            <p>Ese valor es poco probable para un contenedor refrigerado.</p></div>
        )}
        <button type="button" className="btn btn-pri" disabled={n === null}
          onClick={() => {
            if (n === null) return;
            if (esImprobable(n) && !confirmar) { setConfirmar(true); return; }
            onGuardar(n);
          }}>
          {confirmar ? `Sí, guardar ${n !== null ? formatearC(n) : ""} °C` : "Guardar temperatura"}
        </button>
        <button type="button" className="btn btn-sec btn-ch"
          onClick={() => (permitirSin ? onGuardar(null) : onCerrar())}>
          {permitirSin ? "Sin temperatura" : "Cancelar"}
        </button>
      </div>
    </div>
  );
}
