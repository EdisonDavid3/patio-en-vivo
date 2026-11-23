import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import type { Usuario } from "../datos/tipos";
import { fijarAutor, mover, pendientesDeEnvio, vistaPatio, zonas as leerZonas } from "../datos/repo";
import { cerrarSesion, sesion } from "../datos/usuarios";
import { reiniciarDemo, USUARIOS_DEMO } from "../datos/semilla";
import { db } from "../datos/db";
import { Patio } from "./Patio";
import { PlanoPC } from "./PlanoPC";
import { Llegada } from "./Llegada";
import { Ronda } from "./Ronda";
import { Detalle } from "./Detalle";
import { Buscar } from "./Buscar";
import { Reporte } from "./Reporte";
import { Entrada } from "./Entrada";
import { Usuarios } from "./Usuarios";
import { Turno } from "./Turno";
import { Tutorial, type PantallaTutorial } from "./Tutorial";
import { useAncho, useTema } from "./util";
import { hhmmAmPm } from "../dominio/tiempo";
import { NOMBRE_ROL, puede } from "../dominio/permisos";

type Pantalla = "patio" | "llegada" | "ronda" | "turno" | "buscar" | "reporte" | "usuarios" | "detalle";

export function App() {
  const [yo, setYo] = useState<Usuario | null | undefined>(undefined);
  const [pantalla, setPantalla] = useState<Pantalla>("patio");
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [destacada, setDestacada] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; deshacer?: () => void } | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const [tutorial, setTutorial] = useState(false);
  const [invita, setInvita] = useState(false);
  const [hojaPrueba, setHojaPrueba] = useState(false);
  const [hojaMas, setHojaMas] = useState(false);
  const [reiniciando, setReiniciando] = useState(false);
  const [rondaVista, setRondaVista] = useState<string | null>(null);
  const ancho = useAncho();
  const [tema, alternarTema] = useTema();

  const vista = useLiveQuery(() => vistaPatio(), [ahora]);
  const zonas = useLiveQuery(() => leerZonas(), []);
  const pendientes = useLiveQuery(() => pendientesDeEnvio(), []) ?? 0;

  useEffect(() => { void sesion().then((u) => setYo(u)); }, []);
  useEffect(() => { if (yo) fijarAutor(yo.id); }, [yo]);

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(t);
  }, [aviso]);
  useEffect(() => {
    try { if (!localStorage.getItem("ts-tutorial")) setInvita(true); } catch { /* bloqueado */ }
  }, []);

  function marcarVisto() {
    setInvita(false);
    try { localStorage.setItem("ts-tutorial", "visto"); } catch { /* da igual */ }
  }
  function cerrarTutorial() { setTutorial(false); marcarVisto(); }

  if (yo === undefined || !vista || !zonas) {
    return <div className="app"><div className="cuerpo"><p className="sin-datos">Preparando el patio…</p></div></div>;
  }

  if (!yo) {
    return (
      <div className="app">
        <main className="cuerpo">
          <Entrada onEntro={(u) => { setYo(u); fijarAutor(u.id); setPantalla("patio"); }} />
        </main>
      </div>
    );
  }

  const rol = yo.rol;
  const NAV: { id: Pantalla; icono: string; texto: string }[] = [
    { id: "patio", icono: "▦", texto: "Patio" },
    ...(puede(rol, "registrarLlegada") ? [{ id: "llegada" as const, icono: "＋", texto: "Llegada" }] : []),
    ...(puede(rol, "medir") ? [{ id: "ronda" as const, icono: "◷", texto: "Ronda" }] : []),
    ...(ancho && puede(rol, "verificarTurno") ? [{ id: "turno" as const, icono: "☑", texto: "Turno" }] : []),
    { id: "buscar", icono: "⌕", texto: "Buscar" },
    ...(ancho ? [{ id: "reporte" as const, icono: "▤", texto: "Reportes" }] : []),
    ...(ancho && puede(rol, "usuarios") ? [{ id: "usuarios" as const, icono: "👤", texto: "Usuarios" }] : []),
  ];

  function abrirPosicion(id: string) {
    const e = vista!.porPosicion.get(id);
    setSeleccion(id);
    setDestacada(null);
    if (e?.estadia) setPantalla("detalle");
    else if (puede(rol, "registrarLlegada")) setPantalla("llegada");
  }

  const titulos: Record<Pantalla, string> = {
    patio: "Patio", llegada: "Registrar llegada",
    ronda: `Ronda de las ${hhmmAmPm(vista.ronda.ms)}`,
    turno: "Verificación de turno", buscar: "Buscar contenedor",
    reporte: "Reporte diario", usuarios: "Usuarios", detalle: "Detalle",
  };

  const enVentanaPC = ancho && (pantalla === "detalle" || pantalla === "llegada");
  const base: Pantalla = enVentanaPC ? "patio" : pantalla;
  const cuerpoFijo = base === "ronda" || (ancho && base === "patio") || base === "reporte";

  // aviso de ronda: solo si a este rol le toca medir y quedan pendientes
  const pendRonda = vista.lista.filter((e) => e.cuentaEnRonda && !e.medidaEnRonda).length;
  const claveRonda = `${vista.ronda.dia}-${vista.ronda.indice}`;
  const mostrarAvisoRonda = puede(rol, "medir") && pendRonda > 0 && rondaVista !== claveRonda
    && base !== "ronda" && !tutorial;

  return (
    <div className="app">
      <header className="cab">
        {pantalla === "detalle" && !ancho && (
          <button type="button" className="atras" onClick={() => setPantalla("patio")} aria-label="Volver">‹</button>
        )}
        <h1>{ancho ? "Patio en Vivo — Total Seafood" : titulos[pantalla]}</h1>
        {ancho && (
          <nav className="menu-pc">
            {NAV.map((n) => (
              <button key={n.id} type="button" className={base === n.id ? "on" : ""}
                onClick={() => setPantalla(n.id)}>{n.texto}</button>
            ))}
          </nav>
        )}
        <button type="button" className="sinc" onClick={() => setHojaMas(true)}
          title={`${yo.nombre} · ${NOMBRE_ROL[rol]}`}>
          <i />{yo.nombre.split(" ")[0]}
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

      {mostrarAvisoRonda && (
        <div className="aviso-ronda">
          <span>⏰ Ronda de las {hhmmAmPm(vista.ronda.ms)} · faltan {pendRonda}</span>
          <button type="button" className="si" onClick={() => setPantalla("ronda")}>Ir a la ronda</button>
          <button type="button" onClick={() => setRondaVista(claveRonda)} aria-label="Cerrar aviso">✕</button>
        </div>
      )}

      <main className={"cuerpo" + (cuerpoFijo ? " fijo" : "")}>
        {base === "patio" && (ancho
          ? <PlanoPC vista={vista} zonas={zonas} onPosicion={abrirPosicion} actualizado={hhmmAmPm(ahora)}
              puedeArrastrar={puede(rol, "arrastrar")}
              onMover={async (estadiaId, numero, de, a) => {
                const r = await mover(estadiaId, a);
                if (r.ok) setAviso({
                  texto: `${numero} movido de ${de.replace("-", " ")} a ${a.replace("-", " ")}`,
                  deshacer: () => void mover(estadiaId, de),
                });
                else setAviso({ texto: r.error });
              }} />
          : <Patio vista={vista} zonas={zonas} onPosicion={abrirPosicion} destacada={destacada} />)}

        {base === "llegada" && (
          <Llegada vista={vista} zonas={zonas} posicionId={seleccion}
            onCancelar={() => setPantalla("patio")}
            onListo={(id) => { setSeleccion(id); setAviso({ texto: `Llegada registrada en ${id.replace("-", " ")}` }); setPantalla("patio"); }} />
        )}

        {base === "ronda" && (
          <Ronda vista={vista} zonas={zonas} usuario={yo} onSalir={() => setPantalla("patio")} />
        )}

        {base === "turno" && (
          <Turno vista={vista} zonas={zonas} usuario={yo}
            onPosicion={abrirPosicion} onAviso={(t) => setAviso({ texto: t })} />
        )}

        {base === "buscar" && (
          <Buscar vista={vista} zonas={zonas} onPosicion={(id) => { setDestacada(id); abrirPosicion(id); }} />
        )}

        {base === "reporte" && <Reporte />}

        {base === "usuarios" && puede(rol, "usuarios") && (
          <Usuarios yo={yo} onAviso={(t) => setAviso({ texto: t })} />
        )}

        {base === "detalle" && seleccion && (
          <Detalle vista={vista} zonas={zonas} posicionId={seleccion} rol={rol}
            onCerrar={() => setPantalla("patio")}
            onAviso={(texto, deshacer) => setAviso({ texto, deshacer })} />
        )}
      </main>

      {!ancho && (
        <nav className="pie">
          {NAV.map((n) => (
            <button key={n.id} type="button" className={base === n.id ? "on" : ""}
              onClick={() => { if (n.id === "llegada") setSeleccion(null); setPantalla(n.id); }}>
              <em>{n.icono}</em>{n.texto}
            </button>
          ))}
          <button type="button" onClick={() => setHojaMas(true)}><em>⋯</em>Más</button>
        </nav>
      )}

      {enVentanaPC && (
        <div className="ventana-velo" onClick={() => setPantalla("patio")}>
          <div className="ventana" onClick={(e) => e.stopPropagation()}>
            <div className="ventana-cab">
              <b>{pantalla === "detalle" ? "Contenedor" : "Registrar llegada"}</b>
              <button type="button" onClick={() => setPantalla("patio")} aria-label="Cerrar">✕</button>
            </div>
            {pantalla === "detalle" && seleccion && (
              <Detalle enVentana rol={rol} vista={vista} zonas={zonas} posicionId={seleccion}
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

      {hojaMas && (
        <div className="velo" onClick={() => setHojaMas(false)}>
          <div className="hoja" onClick={(e) => e.stopPropagation()}>
            <h2>{yo.nombre}</h2>
            <p>{NOMBRE_ROL[rol]} · sesión abierta en este aparato</p>
            {!ancho && (
              <>
                <button type="button" className="btn btn-sec" onClick={() => { setPantalla("reporte"); setHojaMas(false); }}>
                  ▤ Reporte diario
                </button>
                {puede(rol, "verificarTurno") && (
                  <button type="button" className="btn btn-sec" onClick={() => { setPantalla("turno"); setHojaMas(false); }}>
                    ☑ Verificación de turno
                  </button>
                )}
                {puede(rol, "usuarios") && (
                  <button type="button" className="btn btn-sec" onClick={() => { setPantalla("usuarios"); setHojaMas(false); }}>
                    👤 Usuarios
                  </button>
                )}
              </>
            )}
            <button type="button" className="btn btn-sec" onClick={() => { setHojaMas(false); setHojaPrueba(true); }}>
              🧪 Modo de prueba
            </button>
            <button type="button" className="btn btn-rojo" onClick={async () => {
              await cerrarSesion();
              setHojaMas(false);
              setYo(null);
            }}>Cerrar sesión</button>
            <button type="button" className="btn btn-sec btn-ch" onClick={() => setHojaMas(false)}>Cerrar</button>
          </div>
        </div>
      )}

      {tutorial && <Tutorial onCerrar={cerrarTutorial} irA={(p: PantallaTutorial) => setPantalla(p)} />}

      {hojaPrueba && (
        <div className="velo" onClick={() => setHojaPrueba(false)}>
          <div className="hoja" onClick={(e) => e.stopPropagation()}>
            <h2>🧪 Modo de prueba</h2>
            <p>
              Estás usando la demostración de la Fase 0. Todo vive dentro de este aparato:
              no hay servidor y <b>ningún dato es real</b>. Toca lo que quieras sin miedo.
            </p>
            <div className="aviso" style={{ background: "var(--acento-sup)", borderColor: "var(--acento)", borderLeftColor: "var(--acento)" }}>
              <b style={{ color: "var(--acento-tinta)" }}>📵 Cada aparato guarda lo suyo</b>
              <p>Lo que registras en el teléfono <b>no aparece en la PC</b>, ni al revés. Se juntan en la Fase 1.</p>
            </div>
            <div className="campo">
              <label>Usuarios de prueba y sus PIN</label>
              <dl className="dl">
                {USUARIOS_DEMO.map((u) => (
                  <div key={u.nombre} style={{ display: "contents" }}>
                    <dt>{u.nombre} · {NOMBRE_ROL[u.rol]}</dt>
                    <dd><b>{u.pin}</b></dd>
                  </div>
                ))}
              </dl>
              <p className="ayuda">Cierra sesión desde tu nombre, arriba, para entrar con otro rol.</p>
            </div>
            <button type="button" className="btn btn-pri" onClick={() => { setHojaPrueba(false); setTutorial(true); }}>
              ▶ Ver el tutorial otra vez
            </button>
            <button type="button" className="btn btn-sec" disabled={reiniciando}
              onClick={async () => {
                setReiniciando(true);
                await reiniciarDemo();
                setReiniciando(false);
                setHojaPrueba(false);
                setPantalla("patio");
                setYo(await sesion());
                setAviso({ texto: "Modo de prueba reiniciado" });
              }}>
              {reiniciando ? "Generando…" : "↻ Reiniciar el modo de prueba"}
            </button>
            <button type="button" className="btn btn-sec btn-ch" onClick={async () => {
              await db.transaction("rw", db.tables, async () => { for (const t of db.tables) await t.clear(); });
              setHojaPrueba(false);
              setYo(null);
            }}>
              📱 Simular un teléfono nuevo
            </button>
            <p className="ayuda">
              Borra todo, como si acabaras de escanear el QR: te pedirá nombre y PIN.
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
