import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { EstadoPosicion, Zona } from "../datos/tipos";
import type { VistaPatio } from "../datos/repo";
import { COLS_PC, GRUPOS } from "../datos/zonas";
import { claseDe, valorDe } from "./util";
import { hhmmAmPm } from "../dominio/tiempo";

type Filtro = { alertas: boolean; pendientes: boolean };
function pasa(e: EstadoPosicion, f: Filtro) {
  if (f.alertas) { const c = claseDe(e); if (c !== "alerta" && c !== "urgencia") return false; }
  if (f.pendientes && !(e.cuentaEnRonda && !e.medidaEnRonda)) return false;
  return true;
}

function Tabla({ zona, filas, filtro, onPosicion }: {
  zona: Zona; filas: EstadoPosicion[]; filtro: Filtro; onPosicion: (id: string) => void;
}) {
  const cols = COLS_PC[zona.id] ?? 1;
  const porCol = Math.ceil(filas.length / cols);
  const trozos = Array.from({ length: cols }, (_, i) => filas.slice(i * porCol, (i + 1) * porCol));
  return (
    <div className="pc-fila-z">
      {trozos.map((trozo, i) => (
        <div className="tz" key={i}>
          <div className="tz-cab">
            {zona.cap}
            {cols > 1 && ` (${trozo[0]?.posicion.numero}–${trozo.at(-1)?.posicion.numero})`}
          </div>
          <table className="tzt">
            <thead>
              <tr>
                <th className="k-nro">Nº</th>
                <th style={{ textAlign: "left" }}>Contenedor</th>
                <th style={{ textAlign: "right" }}>Temp.</th>
                <th style={{ textAlign: "right" }}>Hora</th>
              </tr>
            </thead>
            <tbody>
              {trozo.map((e) => {
                const cl = claseDe(e);
                const vis = pasa(e, filtro);
                return (
                  <tr key={e.posicion.id} className={cl + (vis ? "" : " apagado")}
                      onClick={() => e.estadia && onPosicion(e.posicion.id)}
                      style={{ cursor: e.estadia ? "pointer" : "default" }}>
                    <td className="k-nro">{e.posicion.numero}</td>
                    <td className="k-cont">
                      {e.estadia ? e.estadia.numero : "libre"}
                      {e.cuentaEnRonda && !e.medidaEnRonda && <span className="k-sin"> SIN TOMAR</span>}
                    </td>
                    <td className="k-t">{e.estadia ? valorDe(e).replace(" °C", "") : "—"}</td>
                    <td className="k-h">{e.ultima ? hhmmAmPm(e.ultima.tomadaMs) : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

/** La hoja de patio completa, ajustada para que quepa entera en la pantalla. */
export function PlanoPC({ vista, zonas, onPosicion, actualizado }: {
  vista: VistaPatio; zonas: Zona[]; onPosicion: (id: string) => void; actualizado: string;
}) {
  const [filtro, setFiltro] = useState<Filtro>({ alertas: false, pendientes: false });
  const [pleno, setPleno] = useState(false);
  const lienzo = useRef<HTMLDivElement>(null);
  const plano = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);

  useLayoutEffect(() => {
    function medir() {
      const L = lienzo.current, P = plano.current;
      if (!L || !P) return;
      const dispW = L.clientWidth - 16, dispH = L.clientHeight - 16;
      const natW = P.offsetWidth, natH = P.offsetHeight;
      if (!natW || !natH) return;
      const k = Math.min(dispW / natW, dispH / natH);
      setEscala(Math.max(0.45, Math.min(pleno ? 2.2 : 1.35, k)));
    }
    medir();
    const ro = new ResizeObserver(medir);
    if (lienzo.current) ro.observe(lienzo.current);
    globalThis.addEventListener("resize", medir);
    return () => { ro.disconnect(); globalThis.removeEventListener("resize", medir); };
  }, [pleno, vista, filtro]);

  useEffect(() => {
    if (!pleno) return;
    const f = (e: KeyboardEvent) => { if (e.key === "Escape") setPleno(false); };
    globalThis.addEventListener("keydown", f);
    return () => globalThis.removeEventListener("keydown", f);
  }, [pleno]);

  let oc = 0, urg = 0, ale = 0, sin = 0;
  for (const e of vista.lista) {
    if (!e.estadia) continue;
    oc++;
    const c = claseDe(e);
    if (c === "urgencia") urg++; else if (c === "alerta") ale++;
    if (e.cuentaEnRonda && !e.medidaEnRonda) sin++;
  }

  const hoja = (
    <div className="pc-lienzo" ref={lienzo}>
      <div className="pc-plano" ref={plano} style={{ transform: `scale(${escala})` }}>
        {GRUPOS.map((g) => (
          <div className="pc-col" key={g}>
            {zonas.filter((z) => z.grupo === g).map((z) => (
              <Tabla key={z.id} zona={z} filtro={filtro} onPosicion={onPosicion}
                filas={vista.lista.filter((e) => e.posicion.zonaId === z.id)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  if (pleno) {
    return (
      <div className="pleno">
        <button type="button" className="salir" onClick={() => setPleno(false)}>Salir de pantalla completa (Esc)</button>
        {hoja}
      </div>
    );
  }

  return (
    <div className="pc">
      <div className="pc-barra">
        <div className="pc-res">
          <div><b className="tn">{oc}</b><span>Ocupadas</span></div>
          <div><b className="tn">{vista.lista.length - oc}</b><span>Libres</span></div>
          <div className="avi"><b className="tn">{urg}</b><span>En urgencia</span></div>
          <div className="ale"><b className="tn">{ale}</b><span>En alerta</span></div>
          <div><b className="tn">{sin}</b><span>Sin tomar {String(vista.ronda.horaFija).padStart(2, "0")}:00</span></div>
        </div>
        <div className="filtros" style={{ flex: "none" }}>
          <button type="button" aria-pressed={filtro.alertas}
            onClick={() => setFiltro((f) => ({ ...f, alertas: !f.alertas }))}>▲ Solo alertas</button>
          <button type="button" aria-pressed={filtro.pendientes}
            onClick={() => setFiltro((f) => ({ ...f, pendientes: !f.pendientes }))}>◷ Sin tomar en esta ronda</button>
        </div>
        <button type="button" className="vivo" style={{ cursor: "pointer" }} onClick={() => setPleno(true)}>
          ⛶ Pantalla completa
        </button>
        <span className="vivo"><i />En vivo · {actualizado}</span>
      </div>
      {hoja}
    </div>
  );
}
