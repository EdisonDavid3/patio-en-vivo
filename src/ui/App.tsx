import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { pendientesDeEnvio, usuario as leerUsuario, vistaPatio, zonas as leerZonas } from "../datos/repo";
import { Patio } from "./Patio";
import { PlanoPC } from "./PlanoPC";
import { Llegada } from "./Llegada";
import { Ronda } from "./Ronda";
import { Detalle } from "./Detalle";
import { Buscar } from "./Buscar";
import { Reporte } from "./Reporte";
import { Tutorial, type PantallaTutorial } from "./Tutorial";
import { reiniciarDemo } from "../datos/semilla";
import { useAncho, useTema } from "./util";
import { hhmmAmPm } from "../dominio/tiempo";

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
  const [tutorial, setTutorial] = useState(false);
  const [hojaPrueba, setHojaPrueba] = useState(false);
  const [reiniciando, setReiniciando] = useState(false);

  const [invita, setInvita] = useState(false);

  // el recorrido NO arranca solo: se ofrece una vez y lo elige quien abre la app
  useEffect(() => {
    try {
      if (!localStorage.getItem("ts-tutorial")) setInvita(true);
    } catch { /* almacenamiento bloqueado */ }
  }, []);
  function marcarVisto() {
    setInvita(false);
    try { localStorage.setItem("ts-tutorial", "visto"); } catch { /* da igual */ }
  }
  function cerrarTutorial() { setTutorial(false); marcarVisto(); }
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
    return <div className="app"><div className="cuerpo"><p className="sin-datos">Preparando el patio…</p></div></div>;
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

  // En PC el detalle y la llegada se abren como ventana sobre el patio, no como pantalla aparte.
  const enVentanaPC = ancho && (pantalla === "detalle" || pantalla === "llegada");
  const base: Pantalla = enVentanaPC ? "patio" : pantalla;
  const cuerpoFijo = base === "ronda" || (ancho && base === "patio") || base === "reporte";

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
          onClick={() => setAviso({ texto: "Fase 0: este aparato guarda sus propios datos. No se comparten con otros." })}>
          <i />{pendientes === 0 ? "Al día" : `${pendientes} pend.`} · {hhmmAmPm(ahora)}
        </button>
        <button type="button" className="btn-prueba" onClick={() => setHojaPrueba(true)}
          aria-label="Modo de prueba y tutorial" title="Modo de prueba">🧪</button>
        <button type="button" className="sinc" onClick={alternarTema} aria-label="Cambiar a modo claro u oscuro">
          {tema === "claro" ? "☾" : "☀"}
        </button>
      </header>

      {invita && !tutorial && (
        <div className="invita">
          <span>👋 ¿Primera vez por aquí?</span>
          <button type="button" className="si" onClick={() => { setInvita(false); setTutorial(true); }}>
            Ver el recorrido
          </button>
          <button type="button" onClick={marcarVisto}>No, gracias</button>
        </div>
      )}

      <main className={"cuerpo" + (cuerpoFijo ? " fijo" : "")}>
        {base === "patio" && (ancho
          ? <PlanoPC vista={vista} zonas={zonas} onPosicion={abrirPosicion} actualizado={hhmmAmPm(ahora)} />
          : <Patio vista={vista} zonas={zonas} onPosicion={abrirPosicion} destacada={destacada} />)}

        {base === "llegada" && (
          <Llegada vista={vista} zonas={zonas} posicionId={seleccion}
            onCancelar={() => setPantalla("patio")}
            onListo={(id) => { setSeleccion(id); setAviso({ texto: `Llegada registrada en ${id.replace("-", " ")}` }); setPantalla("patio"); }} />
        )}

        {base === "ronda" && (
          <Ronda vista={vista} zonas={zonas} usuario={usuario} onSalir={() => setPantalla("patio")} />
        )}

        {base === "buscar" && (
          <Buscar vista={vista} zonas={zonas}
            onPosicion={(id) => { setDestacada(id); abrirPosicion(id); }} />
        )}

        {base === "reporte" && <Reporte />}

        {base === "detalle" && seleccion && (
          <Detalle vista={vista} zonas={zonas} posicionId={seleccion}
            onCerrar={() => setPantalla("patio")}
            onAviso={(texto, deshacer) => setAviso({ texto, deshacer })} />
        )}
      </main>

      {enVentanaPC && (
        <div className="ventana-velo" onClick={() => setPantalla("patio")}>
          <div className="ventana" onClick={(e) => e.stopPropagation()}>
            <div className="ventana-cab">
              <b>{pantalla === "detalle" ? "Contenedor" : "Registrar llegada"}</b>
              <button type="button" onClick={() => setPantalla("patio")} aria-label="Cerrar">✕</button>
            </div>
            {pantalla === "detalle" && seleccion && (
              <Detalle enVentana vista={vista} zonas={zonas} posicionId={seleccion}
                onCerrar={() => setPantalla("patio")}
                onAviso={(texto, deshacer) => setAviso({ texto, deshacer })} />
            )}
            {pantalla === "llegada" && (
              <Llegada enVentana vista={vista} zonas={zonas} posicionId={seleccion}
                onCancelar={() => setPantalla("patio")}
                onListo={(id) => { setSeleccion(id); setAviso({ texto: `Llegada registrada en ${id.replace("-", " ")}` }); setPantalla("patio"); }} />
            )}
          </div>
        </div>
      )}

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

      {tutorial && (
        <Tutorial onCerrar={cerrarTutorial} irA={(p: PantallaTutorial) => setPantalla(p)} />
      )}

      {hojaPrueba && (
        <div className="velo" onClick={() => setHojaPrueba(false)}>
          <div className="hoja" onClick={(e) => e.stopPropagation()}>
            <h2>🧪 Modo de prueba</h2>
            <p>
              Estás usando la demostración de la Fase 0. Todo vive dentro de este teléfono:
              no hay servidor, no hay cuentas y <b>ningún dato es real</b>. Los contenedores son
              inventados, con números que sí cumplen la norma. Toca lo que quieras sin miedo.
            </p>
            <button type="button" className="btn btn-pri"
              onClick={() => { setHojaPrueba(false); setTutorial(true); }}>
              ▶ Ver el tutorial otra vez
            </button>
            <button type="button" className="btn btn-sec" disabled={reiniciando}
              onClick={async () => {
                setReiniciando(true);
                await reiniciarDemo();
                setReiniciando(false);
                setHojaPrueba(false);
                setPantalla("patio");
                setAviso({ texto: "Modo de prueba reiniciado" });
              }}>
              {reiniciando ? "Generando…" : "↻ Reiniciar el modo de prueba"}
            </button>
            <p className="ayuda">
              Reiniciar borra lo que hayas registrado aquí y arma un patio nuevo. Es lo que conviene
              hacer cuando salga una versión nueva de la app.
            </p>
            <div className="aviso" style={{ background: "var(--acento-sup)", borderColor: "var(--acento)", borderLeftColor: "var(--acento)" }}>
              <b style={{ color: "var(--acento-tinta)" }}>📵 Cada aparato guarda lo suyo</b>
              <p>
                Lo que registras en el teléfono <b>no aparece en la PC</b>, ni al revés. En la Fase 0
                no hay servidor: cada navegador tiene su propio patio. Se juntan en la Fase 1.
              </p>
            </div>
            <p className="ayuda">
              Pendientes de enviar: {pendientes}. En la Fase 0 ese número solo sube, porque todavía
              no hay servidor a donde mandarlos.
            </p>
            <button type="button" className="btn btn-sec btn-ch" onClick={() => setHojaPrueba(false)}>Cerrar</button>
          </div>
        </div>
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

    </div>
  );
}
