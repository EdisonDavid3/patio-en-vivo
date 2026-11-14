import { useEffect, useState } from "react";
import type { Zona } from "../datos/tipos";
import type { Hallazgo, VistaPatio } from "../datos/repo";
import { buscar } from "../datos/repo";
import { MiniPlano } from "./MiniPlano";
import { Fila } from "./Patio";
import { formatear } from "../dominio/iso6346";
import { fechaCorta, duracion } from "../dominio/tiempo";

export function Buscar({ vista, zonas, onPosicion }: {
  vista: VistaPatio; zonas: Zona[]; onPosicion: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hallazgo[]>([]);

  useEffect(() => {
    let vivo = true;
    void buscar(q).then((h) => { if (vivo) setHits(h); });
    return () => { vivo = false; };
  }, [q, vista]);

  const enPatio = hits.filter((h) => h.enPatio && h.posicionId);
  const salidos = hits.filter((h) => !h.enPatio);
  const destacada = enPatio[0]?.posicionId ?? null;

  return (
    <>
      <div className="campo busca">
        <label htmlFor="q">Últimos números del contenedor</label>
        <input id="q" value={q} inputMode="numeric" autoComplete="off" placeholder="8160"
          onChange={(e) => setQ(e.target.value.toUpperCase())} />
        <p className="ayuda" style={{ textAlign: "center" }}>
          Como los nombran en el patio. También sirven las letras.
        </p>
      </div>

      <div className="plano-caja">
        <div className="plano-top">
          <b>Dónde está</b>
          <span>{destacada ? destacada.replace("-", " ") : "—"}</span>
        </div>
        <MiniPlano zonas={zonas} lista={vista.lista} destacada={destacada}
          activa={destacada ? destacada.split("-")[0] : null} />
      </div>

      <div className="sec-cab">
        <b>{q.length < 2 ? "Escribe para buscar" : enPatio.length === 1 ? "1 contenedor en el patio" : `${enPatio.length} en el patio`}</b>
      </div>

      <div className="lista">
        {q.length < 2 && <p className="sin-datos">Escribe al menos dos caracteres.</p>}
        {q.length >= 2 && enPatio.length === 0 && salidos.length === 0 && (
          <p className="sin-datos">Ningún contenedor coincide con «{q}».</p>
        )}
        {enPatio.map((h) => {
          const e = vista.porPosicion.get(h.posicionId!);
          if (!e) return null;
          return <Fila key={h.estadia.id} e={e} destacada={h.posicionId === destacada}
            onClick={() => onPosicion(h.posicionId!)} />;
        })}
        {salidos.length > 0 && (
          <>
            <div className="sec-cab" style={{ marginTop: 6 }}><b>En el historial · ya salieron</b></div>
            {salidos.map((h) => (
              <div key={h.estadia.id} className="fila" style={{ cursor: "default" }}>
                <span className="f-id">—</span>
                <span>
                  <span className="f-num">{formatear(h.estadia.numero)}</span>
                  <span className="f-est" style={{ color: "var(--tinta3)" }}>
                    Salió el {fechaCorta(h.estadia.salida!)}
                  </span>
                </span>
                <span className="f-der">
                  <span className="f-h">{duracion(h.estadia.entrada, h.estadia.salida!)}</span>
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
