import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { EstadoPosicion, Zona } from "../datos/tipos";
import type { VistaPatio } from "../datos/repo";
import { COLS_PC, GRUPOS } from "../datos/zonas";
import { claseDe, valorDe, ETIQUETA_CLASE, ICONO_CLASE } from "./util";
import { Numero } from "./comp/Numero";
import { ETAPAS } from "../dominio/etapas";
import { duracion } from "../dominio/tiempo";
import { Movimientos } from "./comp/Movimientos";
import { hhmmAmPm } from "../dominio/tiempo";

type Filtro = { alertas: boolean; pendientes: boolean };
function pasa(e: EstadoPosicion, f: Filtro) {
  if (f.alertas) { const c = claseDe(e); if (c !== "alerta" && c !== "urgencia") return false; }
  if (f.pendientes && !(e.cuentaEnRonda && !e.medidaEnRonda)) return false;
  return true;
}

type Vistazo = { e: EstadoPosicion; x: number; y: number };

function Tabla({ zona, filas, filtro, onPosicion, onVistazo, sobre }: {
  zona: Zona; filas: EstadoPosicion[]; filtro: Filtro; onPosicion: (id: string) => void;
  onVistazo: (v: Vistazo | null) => void; sobre: string | null;
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
                  <tr key={e.posicion.id} data-pos={e.posicion.id} data-libre={e.estadia ? "no" : "si"}
                      className={cl + (vis ? "" : " apagado")
                        + (sobre === e.posicion.id ? (e.estadia ? " destino-no" : " destino-si") : "")}
                      onClick={() => e.estadia && onPosicion(e.posicion.id)}
                      onMouseEnter={(ev) => e.estadia && onVistazo({ e, x: ev.clientX, y: ev.clientY })}
                      onMouseMove={(ev) => e.estadia && onVistazo({ e, x: ev.clientX, y: ev.clientY })}
                      onMouseLeave={() => onVistazo(null)}
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
export function PlanoPC({ vista, zonas, onPosicion, actualizado, puedeArrastrar, onMover }: {
  vista: VistaPatio; zonas: Zona[]; onPosicion: (id: string) => void; actualizado: string;
  /** D51: arrastrar en el plano es solo del administrador. Los demás usan el botón Mover. */
  puedeArrastrar?: boolean;
  onMover?: (estadiaId: string, numero: string, de: string, a: string) => void;
}) {
  const [filtro, setFiltro] = useState<Filtro>({ alertas: false, pendientes: false });
  const [pleno, setPleno] = useState(false);
  const [vistazo, setVistazo] = useState<Vistazo | null>(null);
  const [arrastre, setArrastre] = useState<null | { estadiaId: string; numero: string; de: string; x: number; y: number }>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const candidato = useRef<null | { estadiaId: string; numero: string; de: string; x: number; y: number }>(null);

  const bajo = useCallback((x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest("tr[data-pos]") as HTMLElement | null;
    return el ? { id: el.dataset.pos!, libre: el.dataset.libre === "si" } : null;
  }, []);

  useEffect(() => {
    if (!puedeArrastrar) return;
    function mover(ev: PointerEvent) {
      const c = candidato.current;
      if (!c) return;
      if (!arrastre && Math.hypot(ev.clientX - c.x, ev.clientY - c.y) < 7) return;
      setVistazo(null);
      setArrastre({ ...c, x: ev.clientX, y: ev.clientY });
      const d = bajo(ev.clientX, ev.clientY);
      setSobre(d && d.id !== c.de ? d.id : null);
    }
    function soltar(ev: PointerEvent) {
      const c = candidato.current;
      candidato.current = null;
      if (c && arrastre) {
        const d = bajo(ev.clientX, ev.clientY);
        if (d && d.libre && d.id !== c.de) onMover?.(c.estadiaId, c.numero, c.de, d.id);
      }
      setArrastre(null);
      setSobre(null);
    }
    globalThis.addEventListener("pointermove", mover);
    globalThis.addEventListener("pointerup", soltar);
    globalThis.addEventListener("pointercancel", soltar);
    return () => {
      globalThis.removeEventListener("pointermove", mover);
      globalThis.removeEventListener("pointerup", soltar);
      globalThis.removeEventListener("pointercancel", soltar);
    };
  }, [puedeArrastrar, arrastre, bajo, onMover]);
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
      <div className={"pc-plano" + (puedeArrastrar ? " arrastrable" : "") + (arrastre ? " arrastrando" : "")}
           ref={plano} style={{ transform: `scale(${escala})` }}
           onPointerDown={(ev) => {
             if (!puedeArrastrar || ev.button !== 0) return;
             const tr = (ev.target as HTMLElement).closest("tr[data-pos]") as HTMLElement | null;
             if (!tr || tr.dataset.libre === "si") return;
             const e = vista.porPosicion.get(tr.dataset.pos!);
             if (!e?.estadia) return;
             candidato.current = { estadiaId: e.estadia.id, numero: e.estadia.numero,
                                   de: e.posicion.id, x: ev.clientX, y: ev.clientY };
           }}>
        {GRUPOS.map((g) => (
          <div className="pc-col" key={g}>
            {zonas.filter((z) => z.grupo === g).map((z) => (
              <Tabla key={z.id} zona={z} filtro={filtro} onPosicion={onPosicion} onVistazo={setVistazo}
                sobre={arrastre ? sobre : null}
                filas={vista.lista.filter((e) => e.posicion.zonaId === z.id)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  const tarjeta = vistazo && !arrastre ? <Vistazo360 v={vistazo} zonas={zonas} /> : null;
  const fantasma = arrastre ? (
    <div className="arrastre" style={{ left: arrastre.x + 12, top: arrastre.y + 12 }}>
      ⇄ {arrastre.numero}
      <i>{sobre ? `soltar en ${sobre.replace("-", " ")}` : "busca una posición libre"}</i>
    </div>
  ) : null;

  if (pleno) {
    return (
      <div className="pleno">
        <button type="button" className="salir" onClick={() => setPleno(false)}>Salir de pantalla completa (Esc)</button>
        {hoja}
        {tarjeta}
        {fantasma}
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
        <Movimientos refresco={vista} estilo="barra" />
        <button type="button" className="vivo" style={{ cursor: "pointer" }} onClick={() => setPleno(true)}>
          ⛶ Pantalla completa
        </button>
        <span className="vivo"><i />En vivo · {actualizado}</span>
      </div>
      {hoja}
      {tarjeta}
      {fantasma}
    </div>
  );
}

/** Al pasar el mouse por una fila: lo importante, sin gráficos. */
function Vistazo360({ v, zonas }: { v: Vistazo; zonas: Zona[] }) {
  const { e } = v;
  if (!e.estadia) return null;
  const cl = claseDe(e);
  const zona = zonas.find((z) => z.id === e.posicion.zonaId)!;
  const ancho = 270, alto = 180;
  const left = Math.min(v.x + 16, globalThis.innerWidth - ancho - 12);
  const top = v.y + alto + 24 < globalThis.innerHeight ? v.y + 16 : v.y - alto - 12;
  return (
    <div className={"vistazo " + cl} style={{ left, top, width: ancho }} aria-hidden="true">
      <div className="vistazo-cab">
        <span className={"etapa " + e.estadia.etapa}>{ETAPAS[e.estadia.etapa].corto}</span>
        {e.cuentaEnRonda && !e.medidaEnRonda && <span className="vistazo-sin">● sin tomar</span>}
      </div>
      <Numero numero={e.estadia.numero} tamano="normal" />
      <div className="vistazo-ubi">{zona.nombre} · {e.posicion.numero}</div>
      <div className="vistazo-temp">
        <b>{valorDe(e)}</b>
        <span>{ICONO_CLASE[cl]} {ETIQUETA_CLASE[cl]}</span>
        <i>{e.ultima ? hhmmAmPm(e.ultima.tomadaMs) : "sin lecturas"}</i>
      </div>
      <dl className="vistazo-dl">
        {e.estadia.producto && <><dt>Producto</dt><dd>{e.estadia.producto}</dd></>}
        {e.estadia.sello && <><dt>Sello</dt><dd>{e.estadia.sello}</dd></>}
        <dt>En patio</dt><dd>{duracion(e.estadia.entrada, Date.now())}</dd>
      </dl>
      <p className="vistazo-pie">Clic para abrirlo</p>
    </div>
  );
}
