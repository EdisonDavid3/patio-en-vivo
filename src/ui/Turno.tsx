import { useEffect, useMemo, useState } from "react";
import type { Usuario, Zona } from "../datos/tipos";
import type { VistaPatio } from "../datos/repo";
import { seccionesVerificadas, turnoDe, verificarSeccion } from "../datos/repo";
import { Numero } from "./comp/Numero";
import { claseDe, valorDe } from "./util";
import { ETAPAS } from "../dominio/etapas";
import { hhmmAmPm } from "../dominio/tiempo";

/**
 * D50 · Verificación de turno. Una vez por turno el patero confirma que cada posición
 * coincide con lo que muestra la página. Reemplaza la hoja de patio en papel.
 * Si todo cuadra son siete toques, no 115: un botón por sección.
 */
export function Turno({ vista, zonas, usuario, onPosicion, onAviso }: {
  vista: VistaPatio; zonas: Zona[]; usuario: Usuario;
  onPosicion: (id: string) => void; onAviso: (t: string) => void;
}) {
  const [hechas, setHechas] = useState<Set<string>>(new Set());
  const [abierta, setAbierta] = useState<string | null>(null);
  const [dudosas, setDudosas] = useState<Set<string>>(new Set());
  const [recarga, setRecarga] = useState(0);

  useEffect(() => { void seccionesVerificadas().then(setHechas); }, [recarga]);

  const turno = turnoDe();
  const zona = zonas.find((z) => z.id === abierta) ?? null;
  const dela = useMemo(
    () => (zona ? vista.lista.filter((e) => e.posicion.zonaId === zona.id) : []),
    [zona, vista],
  );
  const ocupadas = dela.filter((e) => e.estadia);

  async function confirmar() {
    if (!zona) return;
    const malas = [...dudosas].filter((id) => id.startsWith(zona.id + "-")).length;
    await verificarSeccion(zona.id, zona.nombre, malas);
    onAviso(malas === 0 ? `${zona.nombre}: todo correcto` : `${zona.nombre} verificada · ${malas} por corregir`);
    setAbierta(null);
    setRecarga((n) => n + 1);
  }

  if (zona) {
    return (
      <>
        <div className="t-cab">
          <button type="button" className="t-atras" onClick={() => setAbierta(null)}>‹</button>
          <div>
            <b>{zona.nombre}</b>
            <span>{ocupadas.length} ocupadas · {dela.length - ocupadas.length} libres</span>
          </div>
        </div>
        <p className="ayuda">
          Mira el patio y compara. Toca la fila que <b>no</b> coincida para arreglarla; al final confirma.
        </p>
        <div className="lista">
          {dela.map((e) => {
            const marcada = dudosas.has(e.posicion.id);
            return (
              <div key={e.posicion.id} className={"t-fila " + claseDe(e) + (marcada ? " dudosa" : "")}>
                <button type="button" className="t-marca"
                  aria-label={marcada ? "Quitar marca" : "No coincide"}
                  onClick={() => setDudosas((s) => {
                    const n = new Set(s);
                    if (n.has(e.posicion.id)) n.delete(e.posicion.id); else n.add(e.posicion.id);
                    return n;
                  })}>
                  {marcada ? "✗" : "✓"}
                </button>
                <button type="button" className="t-med"
                  onClick={() => e.estadia && onPosicion(e.posicion.id)}>
                  {e.estadia
                    ? <><Numero numero={e.estadia.numero} tamano="chico" />
                        <span className="t-sub">{e.posicion.id.replace("-", " ")} · {ETAPAS[e.estadia.etapa].corto}</span></>
                    : <><b className="t-libre">{e.posicion.id.replace("-", " ")}</b>
                        <span className="t-sub">Libre</span></>}
                </button>
                <span className="t-val">{e.estadia ? valorDe(e) : ""}</span>
              </div>
            );
          })}
        </div>
        <button type="button" className="btn btn-pri" onClick={() => void confirmar()}>
          {[...dudosas].some((id) => id.startsWith(zona.id + "-"))
            ? `Confirmar ${zona.nombre} · ${[...dudosas].filter((id) => id.startsWith(zona.id + "-")).length} por corregir`
            : `Todo correcto en ${zona.nombre}`}
        </button>
      </>
    );
  }

  return (
    <>
      <div className="campo">
        <label>Verificación del turno {turno === "dia" ? "día" : "noche"}</label>
        <p className="ayuda" style={{ marginTop: 0 }}>
          Una vez por turno se confirma que el patio coincide con la página. Esto reemplaza la
          hoja de patio en papel. Van <b>{hechas.size} de {zonas.length}</b> secciones.
        </p>
      </div>
      <div className="lista">
        {zonas.map((z) => {
          const n = vista.lista.filter((e) => e.posicion.zonaId === z.id && e.estadia).length;
          const ok = hechas.has(z.id);
          return (
            <button key={z.id} type="button" className={"t-sec" + (ok ? " ok" : "")}
              onClick={() => { setAbierta(z.id); setDudosas(new Set()); }}>
              <span className="t-tic">{ok ? "✓" : "○"}</span>
              <span className="t-med">
                <b>{z.nombre}</b>
                <span className="t-sub">{n} ocupadas</span>
              </span>
              <span className="t-est">{ok ? "verificada" : "pendiente"}</span>
            </button>
          );
        })}
      </div>
      {hechas.size === zonas.length && (
        <div className="exito">
          ✓ Turno verificado completo por {usuario.nombre.split(" ")[0]} · {hhmmAmPm(Date.now())}
        </div>
      )}
    </>
  );
}
