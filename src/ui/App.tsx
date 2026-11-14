import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { pendientesDeEnvio, usuario as leerUsuario, vistaPatio, zonas as leerZonas } from "../datos/repo";
import { reiniciarDemo } from "../datos/semilla";
import { Patio } from "./Patio";
import { PlanoPC } from "./PlanoPC";
import { Llegada } from "./Llegada";
import { Ronda } from "./Ronda";
import { Detalle } from "./Detalle";
import { Buscar } from "./Buscar";
import { Reporte } from "./Reporte";
import { useAncho, useTema } from "./util";
import { hhmm } from "../dominio/tiempo";

type Pantalla = "patio" | "llegada" | "ronda" | "buscar" | "reporte" | "detalle";

const NAV: { id: Pantalla; icono: string; texto: string }[] = [
  { id: "patio", icono: "▦", texto: "Patio" },
  { id: "llegada", icono: "＋", texto: "Llegada" },
  { id: "ronda", icono: "◷", texto: "Ronda" },
  { id: "buscar", icono: "⌕", texto: "Buscar" },
  { id: "reporte", icono: "▤", texto: "Reportes" },
];

export function App() {
  const [pantalla, setPantalla] = useState<Pantalla>("patio");
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [destacada, setDestacada] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; deshacer?: () => void } | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const ancho = useAncho();
  const [tema, alternarTema] = useTema();

  const vista = useLiveQuery(() => vistaPatio(), [ahora]);
  const zonas = useLiveQuery(() => leerZonas(), []);
  const usuario = useLiveQuery(() => leerUsuario(), []);
  const pendientes = useLiveQuery(() => pendientesDeEnvio(), []) ?? 0;

  // la vista del patio se refresca sola: la oficina puede dejarla abierta
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(t);
  }, [aviso]);

  if (!vista || !zonas || !usuario) {
    return <div className="app"><div className="cuerpo"><p className="vacio">Preparando el patio…</p></div></div>;
  }

  function abrirPosicion(id: string) {
    const e = vista!.porPosicion.get(id);
    setSeleccion(id);
    setDestacada(null);
    setPantalla(e?.estadia ? "detalle" : "llegada");
  }

  const titulos: Record<Pantalla, string> = {
    patio: "Patio", llegada: "Registrar llegada",
    ronda: `Ronda de las ${String(vista.ronda.horaFija).padStart(2, "0")}:00`,
    buscar: "Buscar contenedor", reporte: "Reporte diario", detalle: "Detalle",
  };

  const cuerpoFijo = pantalla === "ronda" || (ancho && pantalla === "patio") || pantalla === "reporte";

  return (
    <div className="app">
      <header className="cab">
        {pantalla === "detalle" && (
          <button type="button" className="atras" onClick={() => setPantalla("patio")} aria-label="Volver">‹</button>
        )}
        <h1>{ancho ? "Patio en Vivo — Total Seafood" : titulos[pantalla]}</h1>
        {ancho && (
          <nav className="menu-pc">
            {NAV.map((n) => (
              <button key={n.id} type="button" className={pantalla === n.id ? "on" : ""}
                onClick={() => setPantalla(n.id)}>{n.texto}</button>
            ))}
          </nav>
        )}
        <button type="button" className={"sinc" + (pendientes === 0 ? " limpio" : "")}
          onClick={() => setAviso({ texto: pendientes === 0 ? "Todo enviado" : `${pendientes} registros esperan WiFi` })}>
          <i />{pendientes === 0 ? "Al día" : `${pendientes} pend.`} · {hhmm(ahora)}
        </button>
        <button type="button" className="sinc" onClick={alternarTema} aria-label="Cambiar a modo claro u oscuro">
          {tema === "claro" ? "☾" : "☀"}
        </button>
      </header>

      <main className={"cuerpo" + (cuerpoFijo ? " fijo" : "")}>
        {pantalla === "patio" && (ancho
          ? <PlanoPC vista={vista} zonas={zonas} onPosicion={abrirPosicion} actualizado={hhmm(ahora)} />
          : <Patio vista={vista} zonas={zonas} onPosicion={abrirPosicion} destacada={destacada} />)}

        {pantalla === "llegada" && (
          <Llegada vista={vista} zonas={zonas} posicionId={seleccion}
            onCancelar={() => setPantalla("patio")}
            onListo={(id) => { setSeleccion(id); setAviso({ texto: `Llegada registrada en ${id.replace("-", " ")}` }); setPantalla("patio"); }} />
        )}

        {pantalla === "ronda" && (
          <Ronda vista={vista} zonas={zonas} usuario={usuario} onSalir={() => setPantalla("patio")} />
        )}

        {pantalla === "buscar" && (
          <Buscar vista={vista} zonas={zonas}
            onPosicion={(id) => { setDestacada(id); abrirPosicion(id); }} />
        )}

        {pantalla === "reporte" && <Reporte />}

        {pantalla === "detalle" && seleccion && (
          <Detalle vista={vista} zonas={zonas} posicionId={seleccion}
            onCerrar={() => setPantalla("patio")}
            onAviso={(texto, deshacer) => setAviso({ texto, deshacer })} />
        )}
      </main>

      {!ancho && (
        <nav className="pie">
          {NAV.map((n) => (
            <button key={n.id} type="button" className={pantalla === n.id ? "on" : ""}
              onClick={() => { setSeleccion(n.id === "llegada" ? null : seleccion); setPantalla(n.id); }}>
              <em>{n.icono}</em>{n.texto}
            </button>
          ))}
        </nav>
      )}

      {aviso && (
        <div className="aviso-flotante">
          <span>{aviso.texto}</span>
          {aviso.deshacer && (
            <button type="button" onClick={() => { aviso.deshacer!(); setAviso({ texto: "Deshecho" }); }}>Deshacer</button>
          )}
          <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar">✕</button>
        </div>
      )}

      {ancho && pantalla === "patio" && (
        <button type="button"
          style={{ position: "fixed", bottom: 10, right: 12, fontSize: 11, border: "1px solid var(--borde)",
                   background: "var(--sup)", borderRadius: 999, padding: "5px 11px", color: "var(--tinta3)" }}
          onClick={() => { if (confirm("¿Volver a generar los datos de demostración?")) void reiniciarDemo(); }}>
          Reiniciar demo
        </button>
      )}
    </div>
  );
}
