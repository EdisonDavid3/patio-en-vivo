import { useEffect, useState } from "react";
import type { Lectura, Ubicacion, Zona } from "../datos/tipos";
import type { VistaPatio } from "../datos/repo";
import { corregirEstadia, deshacerSalida, lecturasDe, mover, reportarSalida, ubicacionesDe } from "../datos/repo";
import { claseDe, valorDe, ETIQUETA_CLASE, ICONO_CLASE } from "./util";
import { formatear } from "../dominio/iso6346";
import { diaOperativo, duracion, fechaCorta, hhmm, HORAS_FIJAS, ranurasDelDia } from "../dominio/tiempo";
import { formatearC, rango } from "../dominio/temperatura";

const PRODUCTOS = ["HOSO 20/30", "HOSO 30/40", "HOSO 40/50", "HOSO 50/60", "HLSO 31/40",
                   "HLSO 41/50", "HLSO 61/70", "P&D 51/60", "PUD 71/90", "EZP 41/50"];
const ESTADOS = ["En espera", "Cargando", "Despachado", "Vacío", "Sin energía"];
const ROTULOS = ["8", "10", "12", "2", "4", "6", "8", "10", "12", "2", "4", "6"];

export function Detalle({ vista, zonas, posicionId, onCerrar, onAviso }: {
  vista: VistaPatio; zonas: Zona[]; posicionId: string;
  onCerrar: () => void; onAviso: (texto: string, deshacer?: () => void) => void;
}) {
  const e = vista.porPosicion.get(posicionId);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [tramos, setTramos] = useState<Ubicacion[]>([]);
  const [hoja, setHoja] = useState<null | "mover" | "salida" | "corregir" | "historial">(null);
  const [zonaDestino, setZonaDestino] = useState<string>("C");
  const estadiaId = e?.estadia?.id;

  useEffect(() => {
    if (!estadiaId) return;
    void lecturasDe(estadiaId).then(setLecturas);
    void ubicacionesDe(estadiaId).then(setTramos);
  }, [estadiaId, vista]);

  if (!e?.estadia) {
    return <p className="vacio">Esta posición está libre.</p>;
  }
  const est = e.estadia;
  const cl = claseDe(e);
  const zona = zonas.find((z) => z.id === e.posicion.zonaId)!;
  const ahora = Date.now();
  const dia = diaOperativo(ahora);
  const ranuras = ranurasDelDia(dia);
  const delDia = lecturas.filter((l) => l.dia === dia);
  const serie = Array.from({ length: 12 }, (_, i) => delDia.find((l) => l.indice === i) ?? null);
  const nums = delDia.filter((l) => l.c !== null).map((l) => l.c!);
  const lo = Math.min(-24, ...nums), hi = Math.max(-11, ...nums);

  return (
    <>
      <div className={"det-cab " + cl}>
        <div className="ubi">{zona.nombre}</div>
        <div className="pid">Posición {e.posicion.numero}</div>
        <div className="cnum">{formatear(est.numero)}</div>
        <div className="det-t">
          <span className="v">{valorDe(e)}</span>
          <span className="e">{ICONO_CLASE[cl]} {ETIQUETA_CLASE[cl]}</span>
          <span className="h">{e.ultima ? hhmm(e.ultima.tomadaMs) : ""}</span>
        </div>
        {est.conAdvertencia && (
          <div className="aviso" style={{ marginTop: 8 }}>
            <b>▲ Número guardado con advertencia</b>
            <p>El dígito verificador no cuadraba. Revisa la placa y corrígelo si hace falta.</p>
          </div>
        )}
      </div>

      <div className="campo">
        <label>Temperaturas del día operativo</label>
        <div className="spark">
          {serie.map((l, i) => {
            if (!l) return <i key={i} className="sin" style={{ height: "10%" }} />;
            if (l.c === null) return <i key={i} className="codigo" style={{ height: "26%" }} />;
            const alto = 22 + ((hi - l.c) / Math.max(1, hi - lo)) * 74;
            return <i key={i} className={rango(l.c)} style={{ height: `${alto.toFixed(0)}%` }} />;
          })}
        </div>
        <div className="spark-h">{ROTULOS.map((t, i) => <span key={i}>{t}</span>)}</div>
        <p className="ayuda">
          Van {delDia.length} de 12 tomas. Ranura actual: {String(HORAS_FIJAS[vista.ronda.indice]).padStart(2, "0")}:00.
          {e.anterior && e.anterior.c !== null && ` Anterior: ${formatearC(e.anterior.c)} °C a las ${hhmm(e.anterior.tomadaMs)}.`}
        </p>
      </div>

      <div className="campo">
        <label>Datos del formato</label>
        <dl className="dl">
          <dt>Producto</dt><dd>{est.producto || "—"}</dd>
          <dt>Sello</dt><dd>{est.sello || "—"}</dd>
          <dt>Estado</dt><dd>{est.estado || "—"}</dd>
          <dt>Hora ingreso</dt><dd>{fechaCorta(est.entrada)} · {hhmm(est.entrada)}</dd>
          <dt>Tiempo en patio</dt><dd>{duracion(est.entrada, ahora)}</dd>
          <dt>Posiciones</dt><dd>{tramos.map((t) => t.posicionId.replace("-", " ")).join(" → ") || "—"}</dd>
        </dl>
        <p className="ayuda">Mover de posición no reinicia el tiempo en patio.</p>
      </div>

      <div className="acc">
        <button type="button" onClick={() => setHoja("mover")}><em>⇄</em>Mover</button>
        <button type="button" className="pel" onClick={() => setHoja("salida")}><em>⤴</em>Salida</button>
        <button type="button" onClick={() => setHoja("corregir")}><em>✎</em>Corregir</button>
        <button type="button" onClick={() => setHoja("historial")}><em>◷</em>Historial</button>
      </div>
      <button type="button" className="btn btn-sec btn-ch" onClick={onCerrar}>Volver al patio</button>

      {hoja === "mover" && (
        <div className="velo" onClick={() => setHoja(null)}>
          <div className="hoja" onClick={(ev) => ev.stopPropagation()}>
            <h2>Mover a otra posición</h2>
            <p>El tiempo en patio sigue corriendo desde la entrada; mover no lo reinicia.</p>
            <div className="zonas-sel">
              {zonas.map((z) => (
                <button key={z.id} type="button"
                  style={z.id === zonaDestino ? { borderColor: "var(--acento)", color: "var(--acento-tinta)" } : undefined}
                  onClick={() => setZonaDestino(z.id)}>{z.nombre}</button>
              ))}
            </div>
            <div className="pos-sel">
              {vista.lista.filter((x) => x.posicion.zonaId === zonaDestino).map((x) => (
                <button key={x.posicion.id} type="button" disabled={!!x.estadia}
                  onClick={async () => {
                    const res = await mover(est.id, x.posicion.id);
                    setHoja(null);
                    if (res.ok) onAviso(`Movido a ${x.posicion.id.replace("-", " ")}`);
                  }}>{x.posicion.numero}</button>
              ))}
            </div>
            <button type="button" className="btn btn-sec" onClick={() => setHoja(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {hoja === "salida" && (
        <div className="velo" onClick={() => setHoja(null)}>
          <div className="hoja" onClick={(ev) => ev.stopPropagation()}>
            <h2>¿Reportar la salida?</h2>
            <p>Se cierra la estadía de {formatear(est.numero)} y queda libre {e.posicion.id.replace("-", " ")}.
               Estuvo {duracion(est.entrada, ahora)} en el patio.</p>
            <button type="button" className="btn btn-rojo" onClick={async () => {
              await reportarSalida(est.id);
              setHoja(null);
              onAviso("Salida registrada", () => void deshacerSalida(est.id));
              onCerrar();
            }}>Sí, reportar la salida</button>
            <button type="button" className="btn btn-sec" onClick={() => setHoja(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {hoja === "corregir" && (
        <div className="velo" onClick={() => setHoja(null)}>
          <div className="hoja" onClick={(ev) => ev.stopPropagation()}>
            <h2>Corregir los datos</h2>
            <p>Queda guardado quién corrigió, cuándo y qué decía antes.</p>
            <div className="campos-opc">
              <select defaultValue={est.producto} onChange={(ev) => void corregirEstadia(est.id, { producto: ev.target.value })}>
                <option value="">Producto…</option>
                {PRODUCTOS.map((p) => <option key={p}>{p}</option>)}
              </select>
              <input defaultValue={est.sello} placeholder="Sello"
                onBlur={(ev) => void corregirEstadia(est.id, { sello: ev.target.value })} />
              <select defaultValue={est.estado} onChange={(ev) => void corregirEstadia(est.id, { estado: ev.target.value })}>
                <option value="">Estado…</option>
                {ESTADOS.map((p) => <option key={p}>{p}</option>)}
              </select>
              <input defaultValue={est.nota} placeholder="Nota de esta posición"
                onBlur={(ev) => void corregirEstadia(est.id, { nota: ev.target.value })} />
            </div>
            {est.conAdvertencia && (
              <button type="button" className="btn btn-sec btn-ch"
                onClick={() => void corregirEstadia(est.id, { conAdvertencia: false })}>
                Marcar el número como revisado y correcto
              </button>
            )}
            <button type="button" className="btn btn-pri" onClick={() => setHoja(null)}>Listo</button>
          </div>
        </div>
      )}

      {hoja === "historial" && (
        <div className="velo" onClick={() => setHoja(null)}>
          <div className="hoja" onClick={(ev) => ev.stopPropagation()}>
            <h2>Historial de {formatear(est.numero)}</h2>
            <div className="hist">
              <div><span>Entrada</span><b>{fechaCorta(est.entrada)} {hhmm(est.entrada)}</b></div>
              {tramos.map((t) => (
                <div key={t.id}><span>{t.posicionId.replace("-", " ")}</span>
                  <b>{fechaCorta(t.desde)} {hhmm(t.desde)} → {t.hasta ? hhmm(t.hasta) : "ahora"}</b></div>
              ))}
              <div><span>Tiempo en patio</span><b>{duracion(est.entrada, ahora)}</b></div>
              <div><span>Lecturas guardadas</span><b>{lecturas.length}</b></div>
              {nums.length > 0 && (
                <div><span>Mínimo / máximo de hoy</span>
                  <b>{formatearC(Math.min(...nums))} / {formatearC(Math.max(...nums))} °C</b></div>
              )}
            </div>
            <div className="hist">
              {lecturas.slice(-8).reverse().map((l) => (
                <div key={l.id}>
                  <span>{fechaCorta(l.tomadaMs)} {hhmm(l.tomadaMs)}{l.atrasada ? " · atrasada" : ""}</span>
                  <b>{l.c !== null ? formatearC(l.c) + " °C" : l.codigo}</b>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-sec" onClick={() => setHoja(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  );
}
