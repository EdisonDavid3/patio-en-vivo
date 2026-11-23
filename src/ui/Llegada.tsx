import { useEffect, useMemo, useState } from "react";
import type { Zona } from "../datos/tipos";
import type { VistaPatio } from "../datos/repo";
import { registrarLlegada } from "../datos/repo";
import { db } from "../datos/db";
import { TecladoISO, NumeroEnProceso } from "./comp/TecladoISO";
import { HojaTemperatura } from "./comp/HojaTemperatura";
import { validar } from "../dominio/iso6346";
import { formatearC } from "../dominio/temperatura";

const PRODUCTOS = ["HOSO 20/30", "HOSO 30/40", "HOSO 40/50", "HOSO 50/60", "HLSO 31/40",
                   "HLSO 41/50", "HLSO 61/70", "P&D 51/60", "PUD 71/90", "EZP 41/50"];
const ESTADOS = ["En espera", "Cargando", "Despachado", "Vacío", "Sin energía"];

/** Limpia lo que se escribe: 4 letras y luego 7 números, en mayúsculas. */
function limpiar(texto: string): string {
  const crudo = texto.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 11);
  let out = "";
  for (const c of crudo) {
    if (out.length < 4) { if (/[A-Z]/.test(c)) out += c; }
    else if (/[0-9]/.test(c)) out += c;
  }
  return out;
}

export function Llegada({ vista, zonas, posicionId, onListo, onCancelar, enVentana }: {
  vista: VistaPatio; zonas: Zona[]; posicionId: string | null;
  onListo: (posicionId: string) => void; onCancelar: () => void;
  /** En PC se escribe con el teclado de verdad; el teclado en pantalla es solo para el teléfono. */
  enVentana?: boolean;
}) {
  const [pos, setPos] = useState<string | null>(posicionId);
  const [num, setNum] = useState("");
  const [temp, setTemp] = useState<number | null>(null);
  const [producto, setProducto] = useState("");
  const [sello, setSello] = useState("");
  const [estado, setEstado] = useState("");
  const [nota, setNota] = useState("");
  const [hoja, setHoja] = useState<null | "temp" | "datos">(null);
  const [error, setError] = useState<string | null>(null);
  const [prefijos, setPrefijos] = useState<string[]>([]);

  useEffect(() => { setPos(posicionId); }, [posicionId]);
  useEffect(() => {
    void db.contenedores.toArray().then((cs) => {
      const cuenta = new Map<string, number>();
      for (const c of cs) cuenta.set(c.prefijo, (cuenta.get(c.prefijo) ?? 0) + 1);
      setPrefijos([...cuenta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([p]) => p));
    });
  }, []);

  const revision = useMemo(() => (num.length === 11 ? validar(num) : null), [num]);
  const completo = num.length === 11;
  const libres = vista.lista.filter((e) => !e.estadia);

  async function guardar(forzado = false) {
    if (!pos || !revision) return;
    if (!revision.ok && !forzado) return;
    const res = await registrarLlegada({
      posicionId: pos, numero: num,
      ...(temp !== null ? { temperaturaC: temp } : {}),
      conAdvertencia: !revision.ok, producto, sello, estado,
    });
    if (!res.ok) { setError(res.error); return; }
    if (nota) await db.estadias.update(res.estadiaId, { nota });
    onListo(pos);
  }

  if (!pos) {
    return (
      <>
        <div className="campo"><label>¿En qué posición está el contenedor?</label>
          <p className="ayuda" style={{ marginTop: 0 }}>Toca una posición libre.</p></div>
        <div className="lista">
          {zonas.map((z) => {
            const dela = libres.filter((e) => e.posicion.zonaId === z.id);
            if (!dela.length) return null;
            return (
              <div key={z.id}>
                <div className="sec-cab"><b>{z.nombre}</b></div>
                <div className="pos-sel" style={{ maxHeight: "none" }}>
                  {dela.map((e) => (
                    <button key={e.posicion.id} type="button" onClick={() => setPos(e.posicion.id)}>
                      {e.posicion.numero}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }

  const zonaNombre = zonas.find((z) => z.id === pos.split("-")[0])?.nombre ?? "";
  const opcionales = [
    temp !== null ? `${formatearC(temp)} °C` : null,
    producto || null, sello || null, estado || null, nota ? "nota" : null,
  ].filter(Boolean);

  return (
    <div className="llegada">
      <div className="l-ubi">
        <div>
          <span className="et">Llega a</span>
          <b>{zonaNombre} · {pos.split("-")[1]}</b>
        </div>
        <button type="button" onClick={() => setPos(null)}>Cambiar</button>
      </div>

      <div className={"l-num" + (revision ? (revision.ok ? " bien" : " mal") : "")}>
        <NumeroEnProceso valor={num} />
        <p className="ayuda" style={{ textAlign: "center", marginTop: 2 }}>
          {num.length < 4 ? "4 letras y luego 7 números" : `${num.length} de 11`}
        </p>
      </div>

      {num.length < 4 && prefijos.length > 0 && (
        <div className="sug">
          {prefijos.map((p) => <button key={p} type="button" onClick={() => setNum(p)}>{p}</button>)}
        </div>
      )}

      {revision && !revision.ok && (
        <div className="aviso">
          <b>▲ El dígito verificador no cuadra</b>
          <p>{revision.mensaje}</p>
        </div>
      )}
      {error && <div className="aviso"><b>No se pudo guardar</b><p>{error}</p></div>}

      {enVentana ? (
        <div className="l-campo">
          <input autoFocus value={num} spellCheck={false} autoComplete="off" inputMode="text"
            aria-label="Número de contenedor"
            placeholder="MSCU1281608"
            onChange={(ev) => { setNum(limpiar(ev.target.value)); setError(null); }} />
          <p className="ayuda">Escríbelo con tu teclado. Se pone en mayúsculas solo y no deja meter letras donde van números.</p>
        </div>
      ) : (
        !completo && <TecladoISO valor={num} onValor={(v) => { setNum(v); setError(null); }} />
      )}

      {(completo || enVentana) && (
        <div className="l-opc">
          <button type="button" onClick={() => setHoja("temp")}>
            {temp !== null ? `🌡 ${formatearC(temp)} °C` : "+ Añadir temperatura"}
          </button>
          <button type="button" onClick={() => setHoja("datos")}>
            {opcionales.length > (temp !== null ? 1 : 0) ? "✎ Producto, sello, estado" : "+ Producto, sello, estado"}
          </button>
          {!enVentana && (
            <button type="button" className="l-borrar" onClick={() => setNum("")}>Cambiar el número</button>
          )}
        </div>
      )}

      <div className="l-pie">
        {revision && !revision.ok ? (
          <>
            <button type="button" className="btn btn-rojo" onClick={() => void guardar(true)}>
              Revisé y está bien, guardar igual
            </button>
            <p className="ayuda" style={{ textAlign: "center" }}>Queda marcado en rojo para el supervisor.</p>
          </>
        ) : (
          <button type="button" className="btn btn-pri" disabled={!completo} onClick={() => void guardar()}>
            Registrar llegada
          </button>
        )}
        <button type="button" className="btn btn-sec btn-ch" onClick={onCancelar}>Cancelar</button>
      </div>

      {hoja === "temp" && (
        <HojaTemperatura
          titulo="Temperatura de llegada"
          texto="Es opcional: los contenedores suelen llegar vacíos y apagados."
          inicial={temp} permitirSin
          onCerrar={() => setHoja(null)}
          onGuardar={(t) => { setTemp(t); setHoja(null); }} />
      )}

      {hoja === "datos" && (
        <div className="velo" onClick={() => setHoja(null)}>
          <div className="hoja" onClick={(e) => e.stopPropagation()}>
            <h2>Datos del formato</h2>
            <p>Todos opcionales. Se pueden llenar después desde el detalle del contenedor.</p>
            <div className="campos-opc">
              <select value={producto} onChange={(e) => setProducto(e.target.value)} aria-label="Producto">
                <option value="">Producto…</option>
                {PRODUCTOS.map((p) => <option key={p}>{p}</option>)}
              </select>
              <input value={sello} placeholder="Sello" aria-label="Sello" onChange={(e) => setSello(e.target.value)} />
              <select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado">
                <option value="">Estado…</option>
                {ESTADOS.map((p) => <option key={p}>{p}</option>)}
              </select>
              <input value={nota} placeholder="Nota" aria-label="Nota" onChange={(e) => setNota(e.target.value)} />
            </div>
            <button type="button" className="btn btn-pri" onClick={() => setHoja(null)}>Listo</button>
          </div>
        </div>
      )}
    </div>
  );
}
