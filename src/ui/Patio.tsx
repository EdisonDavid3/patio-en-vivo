import { useMemo, useRef, useState } from "react";
import type { EstadoPosicion, Zona } from "../datos/tipos";
import type { VistaPatio } from "../datos/repo";
import { recordarSeccion } from "../datos/repo";
import { MiniPlano } from "./MiniPlano";
import { claseDe, ETIQUETA_CLASE, ICONO_CLASE, valorDe } from "./util";
import { formatear } from "../dominio/iso6346";
import { hhmm } from "../dominio/tiempo";

type Filtro = { alertas: boolean; pendientes: boolean };

function pasa(e: EstadoPosicion, f: Filtro): boolean {
  if (f.alertas) {
    const c = claseDe(e);
    if (c !== "alerta" && c !== "urgencia") return false;
  }
  if (f.pendientes && !(e.estadia && !e.medidaEnRonda)) return false;
  return true;
}

export function Fila({ e, destacada, onClick }: { e: EstadoPosicion; destacada?: boolean; onClick?: () => void }) {
  const cl = claseDe(e);
  const id = e.posicion.id.replace("-", " ");
  if (!e.estadia) {
    return (
      <button type="button" className="fila libre" onClick={onClick} data-pos={e.posicion.id}>
        <span className="f-id">{id}</span>
        <span><span className="f-est">Libre</span></span>
        <span className="f-der" />
      </button>
    );
  }
  return (
    <button
      type="button"
      className={"fila " + cl + (destacada ? " late" : "")}
      onClick={onClick}
      data-pos={e.posicion.id}
    >
      <span className="f-id">{id}</span>
      <span>
        <span className="f-num">{formatear(e.estadia.numero)}</span>
        <span className="f-est">
          {ICONO_CLASE[cl]} {ETIQUETA_CLASE[cl]}
          {!e.medidaEnRonda && <span className="marca">SIN TOMAR</span>}
          {e.estadia.conAdvertencia && <span className="marca" style={{ color: "var(--ale)", borderColor: "var(--ale)", background: "var(--ale-sup)" }}>REVISAR Nº</span>}
        </span>
      </span>
      <span className="f-der">
        <span className="f-t">{valorDe(e)}</span>
        <span className="f-h">{e.ultima ? hhmm(e.ultima.tomadaMs) : ""}</span>
      </span>
    </button>
  );
}

export function Patio({ vista, zonas, onPosicion, destacada }: {
  vista: VistaPatio; zonas: Zona[]; onPosicion: (id: string) => void; destacada?: string | null;
}) {
  const [activa, setActiva] = useState("C");
  const [filtro, setFiltro] = useState<Filtro>({ alertas: false, pendientes: false });
  const [compacto, setCompacto] = useState(false);
  const toque = useRef<{ x: number; y: number } | null>(null);
  const hayFiltro = filtro.alertas || filtro.pendientes;

  const cuentas = useMemo(() => {
    let oc = 0, urg = 0, ale = 0;
    for (const e of vista.lista) {
      if (!e.estadia) continue;
      oc++;
      const c = claseDe(e);
      if (c === "urgencia") urg++;
      else if (c === "alerta") ale++;
    }
    return { oc, libres: vista.lista.length - oc, urg, ale };
  }, [vista]);

  const zona = zonas.find((z) => z.id === activa) ?? zonas[0]!;
  const dela = vista.lista.filter((e) => e.posicion.zonaId === zona.id);
  const visibles = dela.filter((e) => pasa(e, filtro));
  const orden = zonas.map((z) => z.id);

  function irA(paso: number) {
    const i = orden.indexOf(activa);
    const sig = orden[(i + paso + orden.length) % orden.length]!;
    setActiva(sig);
    void recordarSeccion(sig);
  }

  return (
    <>
      <div className="res1">
        <div><b className="tn">{cuentas.oc}</b><span>Ocup.</span></div>
        <div><b className="tn">{cuentas.libres}</b><span>Libres</span></div>
        <div className="avi"><b className="tn">{cuentas.urg}</b><span>Urgen.</span></div>
        <div className="ale"><b className="tn">{cuentas.ale}</b><span>Alerta</span></div>
      </div>

      {compacto ? (
        <div className="tira">
          {zonas.map((z) => {
            const n = vista.lista.filter((e) => e.posicion.zonaId === z.id && e.estadia && !e.medidaEnRonda).length;
            return (
              <button key={z.id} type="button" className={z.id === activa ? "aqui" : ""}
                onClick={() => { setActiva(z.id); void recordarSeccion(z.id); }}>
                {z.id === "OF" ? "OFIC" : z.id}{n > 0 && <i style={{ background: "var(--acento)" }} />}
              </button>
            );
          })}
          <button type="button" className="ver" onClick={() => setCompacto(false)}>▦ Plano</button>
        </div>
      ) : (
        <div className="plano-caja">
          <div className="plano-top">
            <b>{zona.nombre}</b>
            <span>{dela.filter((e) => e.estadia).length} ocupadas · {dela.length - dela.filter((e) => e.estadia).length} libres</span>
            <div className="nav">
              <button type="button" onClick={() => irA(-1)} aria-label="Sección anterior">‹</button>
              <button type="button" onClick={() => irA(1)} aria-label="Sección siguiente">›</button>
            </div>
          </div>
          <MiniPlano
            zonas={zonas}
            lista={vista.lista}
            activa={activa}
            destacada={destacada}
            apagada={hayFiltro ? (e) => !pasa(e, filtro) : undefined}
            onZona={(id) => { setActiva(id); void recordarSeccion(id); }}
          />
          <div className="ley">
            <span><i style={{ background: "var(--ok-pl)" }} />Correcto</span>
            <span><i style={{ background: "var(--avi-pl)" }} />Urgencia</span>
            <span><i style={{ background: "var(--ale-pl)" }} />Alerta</span>
            <span><i style={{ background: "var(--nul-pl)" }} />Sin lectura</span>
            <span><i style={{ background: "var(--libre-pl)" }} />Libre</span>
          </div>
        </div>
      )}

      <div className="filtros">
        <button type="button" aria-pressed={filtro.alertas}
          onClick={() => setFiltro((f) => ({ ...f, alertas: !f.alertas }))}>▲ Solo alertas</button>
        <button type="button" aria-pressed={filtro.pendientes}
          onClick={() => setFiltro((f) => ({ ...f, pendientes: !f.pendientes }))}>◷ Sin tomar</button>
      </div>

      <div
        className="lista"
        onScroll={(ev) => setCompacto(ev.currentTarget.scrollTop > 18)}
        onTouchStart={(ev) => { const t = ev.touches[0]!; toque.current = { x: t.clientX, y: t.clientY }; }}
        onTouchEnd={(ev) => {
          const p = toque.current; if (!p) return;
          const t = ev.changedTouches[0]!;
          const dx = t.clientX - p.x, dy = t.clientY - p.y;
          if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6) irA(dx < 0 ? 1 : -1);
          toque.current = null;
        }}
      >
        {visibles.length === 0
          ? <p className="vacio">Nada que mostrar en {zona.nombre} con este filtro.</p>
          : visibles.map((e) => (
              <Fila key={e.posicion.id} e={e} destacada={destacada === e.posicion.id}
                onClick={() => onPosicion(e.posicion.id)} />
            ))}
      </div>
    </>
  );
}
