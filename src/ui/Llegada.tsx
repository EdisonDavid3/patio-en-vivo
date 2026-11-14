import { useEffect, useMemo, useState } from "react";
import type { Zona } from "../datos/tipos";
import type { VistaPatio } from "../datos/repo";
import { registrarLlegada } from "../datos/repo";
import { db } from "../datos/db";
import { Teclado } from "./comp/Teclado";
import { aNumero, mostrarValor } from "./util";
import { normalizar, validar } from "../dominio/iso6346";
import { ETIQUETA, ICONO, esImprobable, formatearC, rango } from "../dominio/temperatura";

const PRODUCTOS = ["HOSO 20/30", "HOSO 30/40", "HOSO 40/50", "HOSO 50/60", "HLSO 31/40",
                   "HLSO 41/50", "HLSO 61/70", "P&D 51/60", "PUD 71/90", "EZP 41/50"];
const ESTADOS = ["En espera", "Cargando", "Despachado", "Vacío", "Sin energía"];

export function Llegada({ vista, zonas, posicionId, onListo, onCancelar }: {
  vista: VistaPatio; zonas: Zona[]; posicionId: string | null;
  onListo: (posicionId: string) => void; onCancelar: () => void;
}) {
  const [pos, setPos] = useState<string | null>(posicionId);
  const [pref, setPref] = useState("");
  const [serie, setSerie] = useState("");
  const [valor, setValor] = useState("");
  const [negativo, setNegativo] = useState(true);
  const [producto, setProducto] = useState("");
  const [sello, setSello] = useState("");
  const [estado, setEstado] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<number | null>(null);
  const [prefijos, setPrefijos] = useState<string[]>([]);

  useEffect(() => { setPos(posicionId); }, [posicionId]);
  useEffect(() => {
    void db.contenedores.toArray().then((cs) => {
      const cuenta = new Map<string, number>();
      for (const c of cs) cuenta.set(c.prefijo, (cuenta.get(c.prefijo) ?? 0) + 1);
      setPrefijos([...cuenta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([p]) => p));
    });
  }, []);

  const numeroTexto = normalizar(pref + serie);
  const revision = useMemo(() => (numeroTexto.length === 11 ? validar(numeroTexto) : null), [numeroTexto]);
  const temp = aNumero(valor, negativo);
  const r = temp === null ? null : rango(temp);
  const libres = vista.lista.filter((e) => !e.estadia);

  const listo = revision !== null && temp !== null &&
    (revision.ok || revision.motivo === "verificador") && pos !== null;

  async function guardar(forzado = false) {
    if (!pos || temp === null || !revision) return;
    if (!revision.ok && revision.motivo === "formato") return;
    if (!revision.ok && !forzado) return;
    if (esImprobable(temp) && confirmar === null) { setConfirmar(temp); return; }
    const res = await registrarLlegada({
      posicionId: pos, numero: numeroTexto, temperaturaC: temp,
      conAdvertencia: !revision.ok, producto, sello, estado,
    });
    if (!res.ok) { setError(res.error); return; }
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

  return (
    <>
      <div className="campo">
        <label>Ubicación</label>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <b style={{ fontSize: 19 }}>{zonaNombre} · {pos.split("-")[1]}</b>
          <button type="button" className="btn btn-sec btn-ch" style={{ marginLeft: "auto", minHeight: 34 }}
            onClick={() => setPos(null)}>Cambiar</button>
        </div>
      </div>

      <div className="campo">
        <label htmlFor="serie">1 · Número de contenedor <span className="oblig">obligatorio</span></label>
        <div className={"iso" + (revision ? (revision.ok ? " bien" : " mal") : "")}>
          <input id="pref" value={pref} inputMode="text" autoCapitalize="characters" maxLength={4}
            placeholder="MSCU" aria-label="Cuatro letras"
            onChange={(e) => setPref(e.target.value.replace(/[^a-zA-Z]/g, "").toUpperCase())} />
          <input id="serie" value={serie} inputMode="numeric" maxLength={7}
            placeholder="1281608" aria-label="Siete dígitos"
            onChange={(e) => setSerie(e.target.value.replace(/\D/g, ""))} />
        </div>
        {prefijos.length > 0 && pref.length < 4 && (
          <div className="sug">
            {prefijos.map((p) => <button key={p} type="button" onClick={() => setPref(p)}>{p}</button>)}
          </div>
        )}
        <p className="ayuda">4 letras + 7 números. Obligatorio y completo.</p>
        {revision && !revision.ok && (
          <div className="aviso">
            <b>▲ {revision.motivo === "formato" ? "Falta parte del número" : "El dígito verificador no cuadra"}</b>
            <p>{revision.mensaje}</p>
          </div>
        )}
      </div>

      <div className="campo">
        <label>2 · Temperatura de llegada <span className="oblig">obligatoria</span></label>
        <div className={"mini-lector " + (r ?? "")}>
          <span className="v">{mostrarValor(valor, negativo)}</span>
          <span className="u">°C</span>
          {valor && (
            <button type="button" onClick={() => setValor(valor.slice(0, -1))}
              style={{ background: "none", border: 0, fontSize: 16, color: "var(--tinta3)" }} aria-label="Borrar">⌫</button>
          )}
          <span className="e">{r ? `${ICONO[r]} ${ETIQUETA[r]}` : ""}</span>
        </div>
        <Teclado compacto valor={valor} onValor={setValor} negativo={negativo} onSigno={() => setNegativo((n) => !n)} />
        <p className="ayuda">El signo menos ya viene puesto: escribe «19» y se guarda −19.</p>
      </div>

      <div className="campo">
        <label>3 · Opcionales · se pueden llenar después</label>
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
        </div>
      </div>

      {error && <div className="aviso"><b>No se pudo guardar</b><p>{error}</p></div>}

      {revision && !revision.ok && revision.motivo === "verificador" ? (
        <>
          <button type="button" className="btn btn-pri" onClick={() => { setSerie(""); setError(null); }}>
            Corregir el número
          </button>
          <button type="button" className="btn btn-rojo" disabled={temp === null} onClick={() => void guardar(true)}>
            Revisé y está bien, guardar igual
          </button>
          <p className="ayuda" style={{ textAlign: "center" }}>
            Queda marcado en rojo en el plano para que el supervisor lo revise.
          </p>
        </>
      ) : (
        <button type="button" className="btn btn-pri" disabled={!listo} onClick={() => void guardar()}>
          Registrar llegada
        </button>
      )}
      <button type="button" className="btn btn-sec btn-ch" onClick={onCancelar}>Cancelar</button>

      {confirmar !== null && (
        <div className="velo" onClick={() => setConfirmar(null)}>
          <div className="hoja" onClick={(e) => e.stopPropagation()}>
            <h2>¿{formatearC(confirmar)} °C es correcto?</h2>
            <p>Ese valor es poco probable para un contenedor refrigerado.</p>
            <button type="button" className="btn btn-pri" onClick={() => void guardar(true)}>Sí, guardar</button>
            <button type="button" className="btn btn-sec" onClick={() => setConfirmar(null)}>Volver a escribirlo</button>
          </div>
        </div>
      )}
    </>
  );
}
