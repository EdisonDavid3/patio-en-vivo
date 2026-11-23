import { useEffect, useMemo, useRef, useState } from "react";
import type { EstadoPosicion, Usuario, Zona } from "../datos/tipos";
import type { VistaPatio } from "../datos/repo";
import { guardarLecturaDeRonda, recordarSeccion } from "../datos/repo";
import { MiniPlano } from "./MiniPlano";
import { Teclado } from "./comp/Teclado";
import { Numero } from "./comp/Numero";
import { aNumero, mostrarValor, claseDe } from "./util";
import { CODIGOS, ETIQUETA, ICONO, esImprobable, formatearC, rango, type Codigo } from "../dominio/temperatura";
import { ETAPAS } from "../dominio/etapas";
import { hhmmAmPm } from "../dominio/tiempo";

type Props = { vista: VistaPatio; zonas: Zona[]; usuario: Usuario; onSalir: () => void };

const deLaSeccion = (vista: VistaPatio, zonaId: string) =>
  vista.lista.filter((e) => e.posicion.zonaId === zonaId && e.cuentaEnRonda);
const pendientesDe = (vista: VistaPatio, zonaId: string) =>
  deLaSeccion(vista, zonaId).filter((e) => !e.medidaEnRonda);

export function Ronda({ vista, zonas, usuario, onSalir }: Props) {
  const [seccion, setSeccion] = useState<string | null>(null);
  const [orden, setOrden] = useState<string[]>([]);
  const [i, setI] = useState(0);
  const [valor, setValor] = useState("");
  const [negativo, setNegativo] = useState(true);
  const [verPlano, setVerPlano] = useState(false);
  const [verCodigos, setVerCodigos] = useState(false);
  const [confirmar, setConfirmar] = useState<number | null>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  const enRonda = vista.lista.filter((e) => e.cuentaEnRonda);
  const hechas = enRonda.filter((e) => e.medidaEnRonda).length;

  function elegirSeccion(zonaId: string, porElFinal = false) {
    const ids = deLaSeccion(vista, zonaId)
      .map((e) => e.posicion.id)
      .sort((a, b) => Number(a.split("-")[1]) - Number(b.split("-")[1]));
    const lista = porElFinal ? [...ids].reverse() : ids;
    setOrden(lista);
    setSeccion(zonaId);
    const primerPendiente = lista.findIndex((id) => !vista.porPosicion.get(id)?.medidaEnRonda);
    setI(primerPendiente < 0 ? 0 : primerPendiente);
    setValor("");
    setVerPlano(false);
    void recordarSeccion(zonaId);
  }

  const siguienteSeccion = useMemo(() => {
    const pref = usuario.ordenSecciones.length ? usuario.ordenSecciones : zonas.map((z) => z.id);
    for (const z of [...pref, ...zonas.map((x) => x.id)]) {
      if (z !== seccion && pendientesDe(vista, z).length > 0) return z;
    }
    return null;
  }, [usuario, zonas, vista, seccion]);

  useEffect(() => { setValor(""); }, [i, seccion]);
  // la lista no salta: solo se mueve lo mínimo para que la fila activa siga a la vista
  useEffect(() => {
    listaRef.current?.querySelector('[data-activa="si"]')?.scrollIntoView({ block: "nearest" });
  }, [i, orden]);

  if (!seccion) {
    return (
      <div className="ronda">
        <div className="r-avance">
          <b className="tn">{hechas} / {enRonda.length}</b>
          <div className="barra"><i style={{ width: `${(hechas / Math.max(1, enRonda.length)) * 100}%` }} /></div>
        </div>
        <div className="plano-caja">
          <div className="plano-top"><b>¿Dónde estás?</b><span>Toca tu sección</span></div>
          <MiniPlano zonas={zonas} lista={vista.lista} modo="ronda" onZona={(z) => elegirSeccion(z)} />
          <div className="ley">
            <span><i style={{ background: "var(--ok-pl)" }} />Medido</span>
            <span><i style={{ background: "var(--ok-pl)", boxShadow: "inset 0 0 0 3px var(--sup)" }} />Pendiente</span>
            <span><i style={{ background: "var(--vacio-pl)" }} />No se mide</span>
          </div>
        </div>
        <div className="tira">
          {zonas.map((z) => {
            const n = pendientesDe(vista, z.id).length;
            return (
              <button key={z.id} type="button" disabled={n === 0} onClick={() => elegirSeccion(z.id)}
                style={n === 0 ? { opacity: .4 } : undefined}>{z.nombre} · {n}</button>
            );
          })}
        </div>
        <p className="ayuda" style={{ textAlign: "center" }}>
          Empieza por la sección donde estás parado. Faltan {enRonda.length - hechas} de {enRonda.length}.
        </p>
      </div>
    );
  }

  const zona = zonas.find((z) => z.id === seccion)!;
  const pendSeccion = orden.filter((id) => !vista.porPosicion.get(id)?.medidaEnRonda);
  const terminada = pendSeccion.length === 0;
  const actual: EstadoPosicion | undefined = orden[i] ? vista.porPosicion.get(orden[i]!) : undefined;
  const numero = aNumero(valor, negativo);
  const r = numero === null ? null : rango(numero);
  const anterior = actual?.ultima ?? null;
  const salto = anterior?.c != null && numero !== null ? Math.abs(numero - anterior.c) : 0;
  const alInicio = i === orden.findIndex((id) => !vista.porPosicion.get(id)?.medidaEnRonda);

  function avanzar() {
    const sig = orden.findIndex((id, k) => k > i && !vista.porPosicion.get(id)?.medidaEnRonda);
    setI(sig < 0 ? orden.length : sig);
  }

  async function guardar(codigo?: Codigo) {
    if (!actual?.estadia) return;
    if (!codigo) {
      if (numero === null) return;
      if (esImprobable(numero) && confirmar === null) { setConfirmar(numero); return; }
    }
    await guardarLecturaDeRonda({
      estadiaId: actual.estadia.id, posicionId: actual.posicion.id, numero: actual.estadia.numero,
      ...(codigo ? { codigo } : { temperaturaC: numero! }),
    });
    setConfirmar(null);
    setVerCodigos(false);
    avanzar();
  }

  return (
    <div className="ronda">
      <div className="r-avance">
        <b className="tn">{hechas} / {enRonda.length}</b>
        <div className="barra"><i style={{ width: `${(hechas / Math.max(1, enRonda.length)) * 100}%` }} /></div>
        <button type="button" className="r-plano" onClick={() => setVerPlano(true)}>▦ Plano</button>
      </div>

      <div className="r-sec">
        <b>{zona.nombre}</b>
        <span>faltan {pendSeccion.length} de {orden.length}</span>
        {alInicio && !terminada && (
          <button type="button" onClick={() => elegirSeccion(seccion!, true)}>↕ Por el final</button>
        )}
      </div>

      <div className="r-cuerpo">
        <div className="r-lista" ref={listaRef}>
          {orden.map((id, k) => {
            const e = vista.porPosicion.get(id);
            if (!e?.estadia) return null;
            const cl = claseDe(e);
            const med = e.medidaEnRonda;
            const activa = k === i && !terminada;
            return (
              <button key={id} type="button" data-activa={activa ? "si" : "no"}
                className={"r-fila " + cl + (activa ? " activa" : "") + (med ? " hecha" : "")}
                onClick={() => setI(k)}>
                <span className="r-tic">{med ? "✓" : activa ? "▶" : "·"}</span>
                <span className="r-med">
                  <Numero numero={e.estadia.numero} tamano="chico" />
                  <span className="r-sub">{e.posicion.id.replace("-", " ")} · {ETAPAS[e.estadia.etapa].corto}</span>
                </span>
                <span className="r-val">
                  {med && e.ultima
                    ? (e.ultima.c !== null ? formatearC(e.ultima.c) : e.ultima.codigo)
                    : "—"}
                </span>
              </button>
            );
          })}
          {terminada && (
            <div className="exito" style={{ marginTop: 4 }}>
              ✓ Terminaste {zona.nombre}. Van {hechas} de {enRonda.length}.
            </div>
          )}
        </div>

        <div className="r-panel">
          {terminada ? (
            <div className="r-fin">
              {siguienteSeccion ? (
                <>
                  <p className="ayuda" style={{ margin: 0 }}>Lo siguiente pendiente, según tu orden:</p>
                  <button type="button" className="btn btn-pri" onClick={() => elegirSeccion(siguienteSeccion)}>
                    Seguir con {zonas.find((z) => z.id === siguienteSeccion)!.nombre} ·
                    faltan {pendientesDe(vista, siguienteSeccion).length} →
                  </button>
                  <button type="button" className="btn btn-sec btn-ch" onClick={() => setVerPlano(true)}>
                    O toca otra sección en el plano
                  </button>
                </>
              ) : (
                <>
                  <p className="ayuda" style={{ margin: 0 }}>No queda ninguna posición sin tomar.</p>
                  <button type="button" className="btn btn-pri" onClick={onSalir}>Volver al patio</button>
                </>
              )}
            </div>
          ) : actual?.estadia ? (
            <>
              <div className={"r-lector " + (r ?? "vacio2")}>
                <div className="r-lector-val">
                  <span className="val">{mostrarValor(valor, negativo)}</span>
                  <span className="uni"> °C</span>
                  {valor && (
                    <button type="button" className="borra" onClick={() => setValor(valor.slice(0, -1))}
                      aria-label="Borrar">⌫</button>
                  )}
                </div>
                <div className="r-lector-pie">
                  <span className="est">{r ? `${ICONO[r]} ${ETIQUETA[r]}` : "Escribe la temperatura"}</span>
                  {anterior && (
                    <span className="ant">
                      antes {anterior.c !== null ? formatearC(anterior.c) : anterior.codigo} · {hhmmAmPm(anterior.tomadaMs)}
                      {salto > 3 && <b className="salto"> · salto {salto.toFixed(1)}</b>}
                    </span>
                  )}
                </div>
              </div>

              <Teclado valor={valor} onValor={setValor} negativo={negativo} onSigno={() => setNegativo((n) => !n)} />

              <div className="r-botones">
                <button type="button" className="btn btn-sec" disabled={i === 0}
                  onClick={() => setI((x) => Math.max(0, x - 1))} aria-label="Anterior">←</button>
                <button type="button" className="btn btn-pri" disabled={numero === null} onClick={() => void guardar()}>
                  Guardar y seguir →
                </button>
                <button type="button" className="btn btn-sec" onClick={() => setVerCodigos(true)}
                  aria-label="No pude medir">✕</button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {verPlano && (
        <div className="velo" onClick={() => setVerPlano(false)}>
          <div className="hoja" onClick={(e) => e.stopPropagation()}>
            <h2>¿A qué sección pasas?</h2>
            <p>Lleno = ya medido. Con hueco = falta. Gris = no se mide en esta etapa.</p>
            <MiniPlano zonas={zonas} lista={vista.lista} activa={seccion} modo="ronda" onZona={(z) => elegirSeccion(z)} />
            <button type="button" className="btn btn-sec" onClick={() => setVerPlano(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {verCodigos && (
        <div className="velo" onClick={() => setVerCodigos(false)}>
          <div className="hoja" onClick={(e) => e.stopPropagation()}>
            <h2>¿Por qué no se pudo medir?</h2>
            <p>Se guarda el código del formato oficial. No cuenta como atrasada ni entra en el mínimo, máximo o promedio.</p>
            <div className="cods">
              {CODIGOS.map((c) => (
                <button key={c.codigo} type="button" onClick={() => void guardar(c.codigo)}>
                  <b>{c.codigo}</b>{c.nombre}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-sec" onClick={() => setVerCodigos(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {confirmar !== null && (
        <div className="velo" onClick={() => setConfirmar(null)}>
          <div className="hoja" onClick={(e) => e.stopPropagation()}>
            <h2>¿{formatearC(confirmar)} °C es correcto?</h2>
            <p>Ese valor es poco probable para un contenedor refrigerado.</p>
            <button type="button" className="btn btn-pri" onClick={() => void guardar()}>
              Sí, guardar {formatearC(confirmar)} °C
            </button>
            <button type="button" className="btn btn-sec" onClick={() => setConfirmar(null)}>Volver a escribirlo</button>
          </div>
        </div>
      )}
    </div>
  );
}
