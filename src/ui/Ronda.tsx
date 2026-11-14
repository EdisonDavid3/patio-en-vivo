import { useEffect, useMemo, useState } from "react";
import type { EstadoPosicion, Usuario, Zona } from "../datos/tipos";
import type { VistaPatio } from "../datos/repo";
import { guardarLecturaDeRonda, recordarSeccion } from "../datos/repo";
import { MiniPlano } from "./MiniPlano";
import { Teclado } from "./comp/Teclado";
import { aNumero, mostrarValor } from "./util";
import { CODIGOS, ETIQUETA, ICONO, esImprobable, formatearC, rango, type Codigo } from "../dominio/temperatura";
import { formatear } from "../dominio/iso6346";
import { hhmm } from "../dominio/tiempo";

type Props = { vista: VistaPatio; zonas: Zona[]; usuario: Usuario; onSalir: () => void };

const pendientesDe = (vista: VistaPatio, zonaId: string) =>
  vista.lista.filter((e) => e.posicion.zonaId === zonaId && e.estadia && !e.medidaEnRonda && !e.estadia.suspendido);

export function Ronda({ vista, zonas, usuario, onSalir }: Props) {
  const [seccion, setSeccion] = useState<string | null>(null);
  const [cola, setCola] = useState<string[]>([]);
  const [i, setI] = useState(0);
  const [valor, setValor] = useState("");
  const [negativo, setNegativo] = useState(true);
  const [verPlano, setVerPlano] = useState(false);
  const [verCodigos, setVerCodigos] = useState(false);
  const [confirmar, setConfirmar] = useState<number | null>(null);

  const ocupadas = vista.lista.filter((e) => e.estadia);
  const hechas = ocupadas.filter((e) => e.medidaEnRonda).length;
  const faltan = ocupadas.length - hechas;

  function elegirSeccion(zonaId: string, porElFinal = false) {
    const ids = pendientesDe(vista, zonaId).map((e) => e.posicion.id);
    const ordenados = ids.sort((a, b) => Number(a.split("-")[1]) - Number(b.split("-")[1]));
    setCola(porElFinal ? ordenados.reverse() : ordenados);
    setSeccion(zonaId);
    setI(0);
    setValor("");
    setVerPlano(false);
    void recordarSeccion(zonaId);
  }

  // D17: la siguiente sección se sugiere según el orden que suele seguir este patero
  const siguiente = useMemo(() => {
    const orden = usuario.ordenSecciones.length ? usuario.ordenSecciones : zonas.map((z) => z.id);
    const resto = [...orden, ...zonas.map((z) => z.id)];
    for (const z of resto) {
      if (z === seccion) continue;
      if (pendientesDe(vista, z).length > 0) return z;
    }
    return null;
  }, [usuario, zonas, vista, seccion]);

  useEffect(() => { setValor(""); }, [i, seccion]);

  if (!seccion) {
    return (
      <>
        <div className="r-avance">
          <b>{hechas} / {ocupadas.length}</b>
          <div className="barra"><i style={{ width: `${(hechas / Math.max(1, ocupadas.length)) * 100}%` }} /></div>
        </div>
        <div className="plano-caja" style={{ flex: "none" }}>
          <div className="plano-top"><b>¿Dónde estás?</b><span>Toca tu sección</span></div>
          <MiniPlano zonas={zonas} lista={vista.lista} modo="ronda" onZona={(z) => elegirSeccion(z)} />
          <div className="ley">
            <span><i style={{ background: "var(--ok-pl)" }} />Medido</span>
            <span><i style={{ background: "var(--ok-pl)", boxShadow: "inset 0 0 0 3px var(--sup)" }} />Pendiente</span>
            <span><i style={{ background: "var(--libre-pl)" }} />Libre</span>
          </div>
        </div>
        <div className="tira">
          {zonas.map((z) => {
            const n = pendientesDe(vista, z.id).length;
            return (
              <button key={z.id} type="button" disabled={n === 0} onClick={() => elegirSeccion(z.id)}
                style={n === 0 ? { opacity: .4 } : undefined}>
                {z.nombre} · {n}
              </button>
            );
          })}
        </div>
        <p className="ayuda" style={{ textAlign: "center" }}>
          Empieza por la sección donde estás parado. Faltan {faltan} de {ocupadas.length}.
        </p>
      </>
    );
  }

  const zona = zonas.find((z) => z.id === seccion)!;
  const terminada = i >= cola.length;
  const actualId = cola[i];
  const actual: EstadoPosicion | undefined = actualId ? vista.porPosicion.get(actualId) : undefined;
  const numero = aNumero(valor, negativo);
  const r = numero === null ? null : rango(numero);

  async function guardar(codigo?: Codigo) {
    if (!actual?.estadia) return;
    if (!codigo) {
      if (numero === null) return;
      if (esImprobable(numero) && confirmar === null) { setConfirmar(numero); return; }
    }
    await guardarLecturaDeRonda({
      estadiaId: actual.estadia.id,
      posicionId: actual.posicion.id,
      numero: actual.estadia.numero,
      ...(codigo ? { codigo } : { temperaturaC: numero! }),
    });
    setConfirmar(null);
    setVerCodigos(false);
    setI((x) => x + 1);
  }

  const anterior = actual?.ultima ?? null;
  const salto = anterior?.c != null && numero !== null ? Math.abs(numero - anterior.c) : 0;

  return (
    <div className="ronda">
      <div className="r-avance">
        <b className="tn">{hechas} / {ocupadas.length}</b>
        <div className="barra"><i style={{ width: `${(hechas / Math.max(1, ocupadas.length)) * 100}%` }} /></div>
      </div>

      <div className="tira">
        <button type="button" className="aqui">{zona.nombre} · faltan {cola.length - i}</button>
        {i === 0 && !terminada && (
          <button type="button" onClick={() => elegirSeccion(seccion, true)}>↕ Empezar por el final</button>
        )}
        <button type="button" className="ver" onClick={() => setVerPlano(true)}>▦ Ver plano</button>
      </div>

      {terminada ? (
        <div className="campo" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
          <div className="exito">✓ Terminaste {zona.nombre}. Van {hechas} de {ocupadas.length}.</div>
          {siguiente ? (
            <>
              <p className="ayuda" style={{ margin: 0 }}>Lo siguiente pendiente, según el orden que sueles seguir:</p>
              <button type="button" className="btn btn-pri" onClick={() => elegirSeccion(siguiente)}>
                Seguir con {zonas.find((z) => z.id === siguiente)!.nombre} · faltan {pendientesDe(vista, siguiente).length} →
              </button>
              <button type="button" className="btn btn-sec btn-ch" onClick={() => setVerPlano(true)}>
                O toca otra sección en el plano
              </button>
            </>
          ) : (
            <>
              <p className="ayuda" style={{ margin: 0 }}>No queda ninguna posición sin tomar en esta ronda.</p>
              <button type="button" className="btn btn-pri" onClick={onSalir}>Volver al patio</button>
            </>
          )}
        </div>
      ) : actual?.estadia ? (
        <>
          <div className="r-act">
            <div className="ubi">{zona.nombre}</div>
            <div className="pid">{actual.posicion.numero}</div>
            <div className="cnum">{formatear(actual.estadia.numero)}</div>
            <div className="r-ant">
              {anterior ? (
                <>
                  <span>Anterior:</span>
                  <b>{anterior.c !== null ? formatearC(anterior.c) + " °C" : anterior.codigo}</b>
                  <span>· {hhmm(anterior.tomadaMs)}</span>
                  {salto > 3 && <span className="salto">· salto de {salto.toFixed(1)} °C</span>}
                </>
              ) : <span>Sin lectura anterior</span>}
            </div>
          </div>

          <div className={"lector " + (r ?? "vacio2")}>
            <div>
              <span className="val">{mostrarValor(valor, negativo)}</span>
              <span className="uni"> °C</span>
              {valor && (
                <button type="button" onClick={() => setValor(valor.slice(0, -1))}
                  style={{ background: "none", border: 0, fontSize: 17, padding: "0 6px", color: "var(--tinta3)" }}
                  aria-label="Borrar">⌫</button>
              )}
            </div>
            <div className="est">{r ? `${ICONO[r]} ${ETIQUETA[r]}` : "Escribe la temperatura"}</div>
          </div>

          <Teclado valor={valor} onValor={setValor} negativo={negativo} onSigno={() => setNegativo((n) => !n)} />

          <div className="r-botones">
            <button type="button" className="btn btn-sec" disabled={i === 0}
              onClick={() => setI((x) => Math.max(0, x - 1))} aria-label="Posición anterior">←</button>
            <button type="button" className="btn btn-pri" disabled={numero === null} onClick={() => void guardar()}>
              Guardar y siguiente →
            </button>
          </div>
          <div className="r-extra">
            <button type="button" className="btn btn-sec btn-ch" onClick={() => setVerCodigos(true)}>No pude medir</button>
          </div>
        </>
      ) : null}

      {verPlano && (
        <div className="velo" onClick={() => setVerPlano(false)}>
          <div className="hoja" onClick={(e) => e.stopPropagation()}>
            <h2>¿A qué sección pasas?</h2>
            <p>Lleno = ya medido. Con hueco = falta.</p>
            <MiniPlano zonas={zonas} lista={vista.lista} activa={seccion} modo="ronda" onZona={(z) => elegirSeccion(z)} />
            <button type="button" className="btn btn-sec" onClick={() => setVerPlano(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {verCodigos && (
        <div className="velo" onClick={() => setVerCodigos(false)}>
          <div className="hoja" onClick={(e) => e.stopPropagation()}>
            <h2>¿Por qué no se pudo medir?</h2>
            <p>Se guarda el código del formato oficial. No cuenta como toma atrasada y no entra en el mínimo, máximo ni promedio.</p>
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
            <p>Ese valor es poco probable para un contenedor refrigerado. Revisa el termómetro antes de guardar.</p>
            <button type="button" className="btn btn-pri" onClick={() => void guardar()}>Sí, guardar {formatearC(confirmar)} °C</button>
            <button type="button" className="btn btn-sec" onClick={() => setConfirmar(null)}>Volver a escribirlo</button>
          </div>
        </div>
      )}
    </div>
  );
}
