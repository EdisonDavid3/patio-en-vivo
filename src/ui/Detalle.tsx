import { useEffect, useState } from "react";
import type { Lectura, TramoEtapa, Ubicacion, Zona } from "../datos/tipos";
import type { VistaPatio } from "../datos/repo";
import {
  CAMARA_CARGA, cambiarEtapa, corregirEstadia, deshacerSalida, guardarLecturaDeRonda, lecturasDe, mover,
  pasarACamara, posicionAnteriorLibre, reportarSalida, sacarDeCamara, tiempoPorEtapa,
  tramosEtapaDe, ubicacionesDe,
} from "../datos/repo";
import { claseDe, valorDe, ETIQUETA_CLASE, ICONO_CLASE } from "./util";
import { Numero } from "./comp/Numero";
import { formatear } from "../dominio/iso6346";
import { GraficoTomas } from "./comp/GraficoTomas";
import { HojaTemperatura } from "./comp/HojaTemperatura";
import { ETAPAS, faltaParaCargar, listoParaCargar, type Etapa } from "../dominio/etapas";
import { formatearC } from "../dominio/temperatura";
import { puede, type Rol } from "../dominio/permisos";
import { diaOperativo, duracion, fechaCorta, hhmmAmPm, HORAS_FIJAS, ranurasDelDia } from "../dominio/tiempo";

const PRODUCTOS = ["HOSO 20/30", "HOSO 30/40", "HOSO 40/50", "HOSO 50/60", "HLSO 31/40",
                   "HLSO 41/50", "HLSO 61/70", "P&D 51/60", "PUD 71/90", "EZP 41/50"];
const ESTADOS = ["En espera", "Cargando", "Despachado", "Vacío", "Sin energía"];
const CERO: Record<Etapa, number> = { vacio: 0, enfriando: 0, cargando: 0, con_producto: 0, despachado: 0 };

type Hoja = null | "camara" | "sacar" | "mover" | "salida" | "corregir" | "historial" | "temp";

export function Detalle({ vista, zonas, posicionId, rol, onCerrar, onAviso, enVentana }: {
  vista: VistaPatio; zonas: Zona[]; posicionId: string; rol: Rol;
  onCerrar: () => void; onAviso: (texto: string, deshacer?: () => void) => void;
  /** En PC el detalle vive dentro de una ventana pequeña, no en una pantalla entera. */
  enVentana?: boolean;
}) {
  const e = vista.porPosicion.get(posicionId);
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [tramos, setTramos] = useState<Ubicacion[]>([]);
  const [etapas, setEtapas] = useState<TramoEtapa[]>([]);
  const [tiempos, setTiempos] = useState<Record<Etapa, number>>(CERO);
  const [previa, setPrevia] = useState<string | null>(null);
  const [hoja, setHoja] = useState<Hoja>(null);
  const [verGrafico, setVerGrafico] = useState(false);
  const [zonaDestino, setZonaDestino] = useState("C");
  const estadiaId = e?.estadia?.id;

  useEffect(() => {
    if (!estadiaId) return;
    void lecturasDe(estadiaId).then(setLecturas);
    void ubicacionesDe(estadiaId).then(setTramos);
    void tramosEtapaDe(estadiaId).then(setEtapas);
    void tiempoPorEtapa(estadiaId).then(setTiempos);
    void posicionAnteriorLibre(estadiaId).then(setPrevia);
  }, [estadiaId, vista]);

  if (!e?.estadia) return <p className="sin-datos">Esta posición está libre.</p>;

  const est = e.estadia;
  const etapa = est.etapa;
  const regla = ETAPAS[etapa];
  const cl = claseDe(e);
  const zona = zonas.find((z) => z.id === e.posicion.zonaId)!;
  const ahora = Date.now();
  const dia = diaOperativo(ahora);
  const ranuras = ranurasDelDia(dia);
  const delDia = lecturas.filter((l) => l.dia === dia);
  const serie = Array.from({ length: 12 }, (_, i) => delDia.find((l) => l.indice === i) ?? null);
  const ultimaC = e.ultima?.c ?? null;
  const listo = etapa === "enfriando" && listoParaCargar(ultimaC);
  const falta = etapa === "enfriando" ? faltaParaCargar(ultimaC) : null;

  const debidas = ranuras.filter((ms) => ms <= ahora).length;
  const camara = vista.lista.filter((x) => x.posicion.zonaId === CAMARA_CARGA);

  async function guardarTemperatura(t: number | null) {
    if (t === null || !e?.estadia) { setHoja(null); return; }
    await guardarLecturaDeRonda({
      estadiaId: e.estadia.id, posicionId: e.posicion.id, numero: e.estadia.numero, temperaturaC: t,
    });
    setHoja(null);
    onAviso(`Temperatura guardada: ${formatearC(t)} °C`);
  }
  const libresCamara = camara.filter((x) => !x.estadia);

  async function irACamara() {
    if (libresCamara.length === 1) {
      const destino = libresCamara[0]!.posicion.id;
      const r = await pasarACamara(est.id, destino);
      if (r.ok) onAviso(`Movido a ${destino.replace("-", " ")} y puesto a cargar`);
      return;
    }
    setHoja("camara");
  }

  return (
    <>
      <div className={"det-cab " + cl}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span className={"etapa grande " + etapa}>{regla.nombre}</span>
          {est.conAdvertencia && <span className="etapa grande alerta"
            style={{ background: "var(--ale-sup)", color: "var(--ale)", borderColor: "var(--ale)" }}>Revisar Nº</span>}
          {puede(rol, "medir") && <button type="button" className="btn-temp" title="Tomar temperatura ahora"
            onClick={async () => {
              if (!regla.mide) await cambiarEtapa(est.id, "enfriando");
              setHoja("temp");
            }}>
            🌡 {regla.mide ? "Tomar temperatura" : "Encender y medir"}
          </button>}
        </div>
        <Numero numero={est.numero} tamano="grande" />
        <div className="ubi" style={{ marginTop: 3 }}>{zona.nombre} · {e.posicion.numero}</div>
        <div className="det-t">
          <span className="v">{valorDe(e)}</span>
          <span className="e">{ICONO_CLASE[cl]} {regla.alerta ? ETIQUETA_CLASE[cl] : regla.corto}</span>
          <span className="h">{e.ultima ? hhmmAmPm(e.ultima.tomadaMs) : "sin lecturas"}</span>
        </div>
      </div>

      {etapa === "enfriando" && (listo
        ? <div className="listo">✓ Listo para cargar. Ya está en {valorDe(e)}.</div>
        : falta !== null
          ? <div className="falta">❄ Enfriando. Le faltan {falta.toFixed(1)} °C para poder cargar.</div>
          : <div className="falta">❄ Enfriando. Todavía sin lectura.</div>)}

      {/* acción principal según la etapa */}
      {etapa === "vacio" && puede(rol, "mover") && (
        <button type="button" className="btn btn-etapa"
          onClick={async () => { await cambiarEtapa(est.id, "enfriando"); onAviso("Puesto a enfriar"); }}>
          ❄ Empezar a enfriar
        </button>
      )}
      {etapa === "enfriando" && puede(rol, "mover") && (
        <button type="button" className={"btn btn-carga" + (listo ? " btn-listo" : "")}
          disabled={libresCamara.length === 0} onClick={() => void irACamara()}>
          ⇩ Pasar a cámara 3 y 4
          {libresCamara.length === 0 ? " · sin cupo" : ` · ${libresCamara.length} libre${libresCamara.length === 1 ? "" : "s"}`}
        </button>
      )}
      {etapa === "cargando" && puede(rol, "mover") && (
        <button type="button" className="btn btn-pri" onClick={() => setHoja("sacar")}>
          ⇧ Sacar de la cámara
        </button>
      )}
      {etapa === "con_producto" && puede(rol, "salida") && (
        <button type="button" className="btn btn-rojo" onClick={() => setHoja("salida")}>
          ⤴ Reportar la salida
        </button>
      )}

      <div className="acc">
        {puede(rol, "mover") && <button type="button" onClick={() => setHoja("mover")}><em>⇄</em>Mover</button>}
        {puede(rol, "corregir") && <button type="button" onClick={() => setHoja("corregir")}><em>✎</em>Corregir</button>}
        <button type="button" onClick={() => setHoja("historial")}><em>◷</em>Historial</button>
        {puede(rol, "salida") && (
          <button type="button" className="pel" onClick={() => setHoja("salida")}><em>⤴</em>Salida</button>
        )}
      </div>
      {!puede(rol, "mover") && (
        <p className="ayuda" style={{ textAlign: "center" }}>
          Tu rol solo consulta. Para cambiar algo, pídeselo a un patero o al administrador.
        </p>
      )}

      {regla.mide ? (
        <div className="campo">
          <button type="button" className="desplegable" aria-expanded={verGrafico}
            onClick={() => setVerGrafico((v) => !v)}>
            📈 Temperaturas del día · {delDia.length} de {debidas} {debidas === 1 ? "toma" : "tomas"}
            <span className="flecha">▾</span>
          </button>
          {verGrafico && (
            <>
              <GraficoTomas titulo="Turno día" conAlerta={regla.alerta} ahora={ahora}
                horas={HORAS_FIJAS.slice(0, 6)} tomas={serie.slice(0, 6)} ranuras={ranuras.slice(0, 6)} />
              <GraficoTomas titulo="Turno noche" conAlerta={regla.alerta} ahora={ahora}
                horas={HORAS_FIJAS.slice(6)} tomas={serie.slice(6)} ranuras={ranuras.slice(6)} />
              <p className="ayuda">
                Toma actual: {hhmmAmPm(vista.ronda.ms)}.
                {!regla.alerta && " En esta etapa la temperatura se anota pero no genera alerta."}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="campo">
          <label>Temperaturas</label>
          <p className="ayuda" style={{ marginTop: 0 }}>
            A un contenedor {regla.nombre.toLowerCase()} no se le toma temperatura:
            no entra en la ronda ni cuenta como «sin tomar».
          </p>
        </div>
      )}

      <div className="campo">
        <label>Datos del formato</label>
        <dl className="dl">
          <dt>Producto</dt><dd>{est.producto || "—"}</dd>
          <dt>Sello</dt><dd>{est.sello || "—"}</dd>
          <dt>Estado</dt><dd>{est.estado || "—"}</dd>
          <dt>Hora ingreso</dt><dd>{fechaCorta(est.entrada)} · {hhmmAmPm(est.entrada)}</dd>
          <dt>Tiempo en patio</dt><dd>{duracion(est.entrada, ahora)}</dd>
          <dt>Posiciones</dt><dd>{tramos.map((t) => t.posicionId.replace("-", " ")).join(" → ") || "—"}</dd>
        </dl>
        <p className="ayuda">Mover de posición no reinicia el tiempo en patio.</p>
      </div>

      <div className="campo">
        <label>Tiempo en cada etapa</label>
        <dl className="dl">
          {(["vacio", "enfriando", "cargando", "con_producto"] as Etapa[])
            .filter((x) => tiempos[x] > 0)
            .map((x) => (
              <div key={x} style={{ display: "contents" }}>
                <dt>{ETAPAS[x].nombre}</dt>
                <dd>{duracion(0, tiempos[x])}</dd>
              </div>
            ))}
        </dl>
      </div>

      <button type="button" className="btn btn-sec btn-ch" onClick={onCerrar}>Volver al patio</button>

      {hoja === "temp" && (
        <HojaTemperatura
          titulo="Tomar temperatura"
          texto={`${formatear(est.numero)} · ${zona.nombre} ${e.posicion.numero}. Se guarda en la toma de las ${hhmmAmPm(vista.ronda.ms)}.`
            + (e.ultima?.c != null ? ` La anterior marcó ${formatearC(e.ultima.c)} °C a las ${hhmmAmPm(e.ultima.tomadaMs)}.` : "")}
          inicial={null}
          onCerrar={() => setHoja(null)}
          onGuardar={(t) => void guardarTemperatura(t)} />
      )}

      {hoja === "camara" && (
        <div className="velo" onClick={() => setHoja(null)}>
          <div className="hoja" onClick={(ev) => ev.stopPropagation()}>
            <h2>¿A qué posición de Cámara 3 y 4?</h2>
            <p>Es la única cámara de carga del patio. Las ocupadas salen apagadas.</p>
            <div className="pos-sel" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
              {camara.map((x) => (
                <button key={x.posicion.id} type="button" disabled={!!x.estadia}
                  style={{ minHeight: 58, fontSize: 18 }}
                  onClick={async () => {
                    const r = await pasarACamara(est.id, x.posicion.id);
                    setHoja(null);
                    if (r.ok) onAviso(`Movido a ${x.posicion.id.replace("-", " ")} y puesto a cargar`);
                  }}>{x.posicion.numero}</button>
              ))}
            </div>
            <button type="button" className="btn btn-sec" onClick={() => setHoja(null)}>Cancelar</button>
          </div>
        </div>
      )}

      {hoja === "sacar" && (
        <div className="velo" onClick={() => setHoja(null)}>
          <div className="hoja" onClick={(ev) => ev.stopPropagation()}>
            <h2>¿Ya tiene producto?</h2>
            <p>Si ya está cargado, empieza la vigilancia de temperatura con alertas de −18 y −15.</p>
            {previa && (
              <button type="button" className="btn btn-pri" onClick={async () => {
                await sacarDeCamara(est.id, previa, true);
                setHoja(null);
                onAviso(`Con producto, de vuelta en ${previa.replace("-", " ")}`);
              }}>
                Sí · volver a {previa.replace("-", " ")}
              </button>
            )}
            <button type="button" className={previa ? "btn btn-sec" : "btn btn-pri"}
              onClick={() => { setHoja("mover"); }}>
              Sí · elegir otra posición
            </button>
            <button type="button" className="btn btn-sec" onClick={async () => {
              await cambiarEtapa(est.id, "enfriando");
              setHoja(null);
              onAviso("Vuelve a enfriando, sin producto");
            }}>
              No · sigue vacío
            </button>
            <button type="button" className="btn btn-sec btn-ch" onClick={() => setHoja(null)}>Cancelar</button>
          </div>
        </div>
      )}

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
                    const destino = x.posicion.id;
                    const r = etapa === "cargando"
                      ? await sacarDeCamara(est.id, destino, true)
                      : await mover(est.id, destino);
                    setHoja(null);
                    if (r.ok) onAviso(`Movido a ${destino.replace("-", " ")}`);
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
            <p>
              Desaparece del patio en vivo y {e.posicion.id.replace("-", " ")} queda libre.
              Sigue en el historial y en los reportes. Estuvo {duracion(est.entrada, ahora)} en el patio.
            </p>
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
              <select defaultValue={est.etapa}
                onChange={(ev) => void cambiarEtapa(est.id, ev.target.value as Etapa)}>
                {(["vacio", "enfriando", "cargando", "con_producto"] as Etapa[]).map((x) => (
                  <option key={x} value={x}>Etapa: {ETAPAS[x].nombre}</option>
                ))}
              </select>
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
            <h2>Historial</h2>
            <Numero numero={est.numero} tamano="normal" />
            <div className="hist">
              <div><span>Entrada</span><b>{fechaCorta(est.entrada)} {hhmmAmPm(est.entrada)}</b></div>
              {etapas.map((t) => (
                <div key={t.id}>
                  <span><span className={"etapa " + t.etapa}>{ETAPAS[t.etapa].corto}</span></span>
                  <b>{hhmmAmPm(t.desde)} → {t.hasta ? hhmmAmPm(t.hasta) : "ahora"} · {duracion(t.desde, t.hasta ?? ahora)}</b>
                </div>
              ))}
              {tramos.map((t) => (
                <div key={t.id}><span>{t.posicionId.replace("-", " ")}</span>
                  <b>{fechaCorta(t.desde)} {hhmmAmPm(t.desde)} → {t.hasta ? hhmmAmPm(t.hasta) : "ahora"}</b></div>
              ))}
              <div><span>Tiempo en patio</span><b>{duracion(est.entrada, ahora)}</b></div>
            </div>
            <div className="hist">
              {lecturas.slice(-8).reverse().map((l) => (
                <div key={l.id}>
                  <span>{fechaCorta(l.tomadaMs)} {hhmmAmPm(l.tomadaMs)}{l.atrasada ? " · atrasada" : ""}</span>
                  <b>{l.c !== null ? l.c.toFixed(1) + " °C" : l.codigo}</b>
                </div>
              ))}
              {lecturas.length === 0 && <div><span>Sin lecturas todavía</span><b>—</b></div>}
            </div>
            <button type="button" className="btn btn-sec" onClick={() => setHoja(null)}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  );
}
