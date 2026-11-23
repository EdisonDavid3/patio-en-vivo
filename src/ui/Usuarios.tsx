import { useEffect, useState } from "react";
import { renderSVG } from "uqr";
import type { Usuario } from "../datos/tipos";
import { activarUsuario, cambiarPin, cambiarRol, crearUsuario, listarUsuarios } from "../datos/usuarios";
import { TecladoPin } from "./comp/TecladoPin";
import { largoPin, NOMBRE_ROL, QUE_HACE, ROLES, type Rol } from "../dominio/permisos";
import { fechaCorta } from "../dominio/tiempo";

type Hoja = null | { tipo: "nuevo" } | { tipo: "pin"; u: Usuario } | { tipo: "rol"; u: Usuario; rol: Rol };

export function Usuarios({ yo, onAviso }: { yo: Usuario; onAviso: (t: string) => void }) {
  const [lista, setLista] = useState<Usuario[]>([]);
  const [hoja, setHoja] = useState<Hoja>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => { void listarUsuarios().then(setLista); }, [recarga]);
  const refrescar = () => setRecarga((n) => n + 1);

  const direccion = globalThis.location.origin + globalThis.location.pathname;
  const qr = renderSVG(direccion, { pixelSize: 6, whiteColor: "#ffffff", blackColor: "#101823" });

  return (
    <>
      <div className="campo">
        <label>Qué puede cada rol</label>
        <div className="roles-ayuda">
          {ROLES.map((r) => (
            <div key={r}>
              <span className={"etapa " + (r === "administrador" ? "cargando" : r === "patero" ? "con_producto" : "vacio")}>
                {NOMBRE_ROL[r]}
              </span>
              <p>{QUE_HACE[r]}</p>
            </div>
          ))}
        </div>
        <div className="aviso" style={{ background: "var(--avi-sup)", borderColor: "var(--avi-bor)", borderLeftColor: "var(--avi)" }}>
          <b style={{ color: "var(--avi)" }}>⚠ En la Fase 0 esto no es un candado</b>
          <p>
            Sin servidor, cualquiera podría crearse un administrador en su propio teléfono.
            Los roles sirven para que cada quien vea lo suyo. El candado de verdad llega en la Fase 1.
          </p>
        </div>
      </div>

      <div className="campo">
        <label>Usuarios ({lista.length})</label>
        <div className="u-lista">
          {lista.map((u) => (
            <div key={u.id} className={"u-fila" + (u.activo ? "" : " baja")}>
              <span className="entrada-ini">{u.nombre.slice(0, 1).toUpperCase()}</span>
              <span className="u-med">
                <b>{u.nombre}{u.id === yo.id && <span className="u-yo">tú</span>}</b>
                <span className="u-sub">
                  {NOMBRE_ROL[u.rol]} · PIN de {largoPin(u.rol)} · desde {fechaCorta(u.creadoMs)}
                  {!u.activo && " · desactivado"}
                </span>
              </span>
              <span className="u-acc">
                <select value={u.rol} aria-label={`Rol de ${u.nombre}`}
                  onChange={async (e) => {
                    const rol = e.target.value as Rol;
                    if (largoPin(rol) !== largoPin(u.rol)) { setHoja({ tipo: "rol", u, rol }); return; }
                    await cambiarRol(u.id, rol);
                    onAviso(`${u.nombre} ahora es ${NOMBRE_ROL[rol].toLowerCase()}`);
                    refrescar();
                  }}>
                  {ROLES.map((r) => <option key={r} value={r}>{NOMBRE_ROL[r]}</option>)}
                </select>
                <button type="button" onClick={() => setHoja({ tipo: "pin", u })}>PIN</button>
                <button type="button" disabled={u.id === yo.id}
                  onClick={async () => { await activarUsuario(u.id, !u.activo); refrescar(); }}>
                  {u.activo ? "Dar de baja" : "Reactivar"}
                </button>
              </span>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-pri btn-ch" onClick={() => setHoja({ tipo: "nuevo" })}>
          + Crear usuario
        </button>
      </div>

      <div className="campo">
        <label>📶 Entrar desde un celular</label>
        <div className="qr-caja">
          <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} aria-label="Código QR de la dirección" />
          <div>
            <p className="ayuda" style={{ marginTop: 0 }}>Escanea este código con la cámara del celular, o escribe:</p>
            <code className="qr-url">{direccion}</code>
            <p className="ayuda">
              La primera vez el teléfono pedirá <b>nombre y un PIN de 4 números</b> y quedará
              registrado como <b>patero</b>. Después entra solo con el PIN, incluso sin señal.
            </p>
            <p className="ayuda">
              En iPhone hay que usar <b>Agregar a pantalla de inicio</b> y abrirla desde ese ícono.
            </p>
          </div>
        </div>
      </div>

      {hoja?.tipo === "nuevo" && (
        <HojaUsuario onCerrar={() => setHoja(null)}
          onListo={(t) => { onAviso(t); setHoja(null); refrescar(); }} />
      )}

      {hoja?.tipo === "pin" && (
        <HojaPin titulo={`PIN nuevo para ${hoja.u.nombre}`} largo={largoPin(hoja.u.rol)}
          onCerrar={() => setHoja(null)}
          onListo={async (pin) => {
            const r = await cambiarPin(hoja.u.id, pin);
            if (!r.ok) return r.error;
            onAviso(`PIN cambiado a ${hoja.u.nombre}`); setHoja(null); refrescar(); return null;
          }} />
      )}

      {hoja?.tipo === "rol" && (
        <HojaPin titulo={`${hoja.u.nombre} pasa a ${NOMBRE_ROL[hoja.rol].toLowerCase()}`}
          texto={`Ese rol lleva un PIN de ${largoPin(hoja.rol)} números. Pon uno nuevo.`}
          largo={largoPin(hoja.rol)} onCerrar={() => setHoja(null)}
          onListo={async (pin) => {
            const r = await cambiarRol(hoja.u.id, hoja.rol, pin);
            if (!r.ok) return r.error;
            onAviso(`${hoja.u.nombre} ahora es ${NOMBRE_ROL[hoja.rol].toLowerCase()}`);
            setHoja(null); refrescar(); return null;
          }} />
      )}
    </>
  );
}

function HojaUsuario({ onListo, onCerrar }: { onListo: (t: string) => void; onCerrar: () => void }) {
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<Rol>("patero");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const largo = largoPin(rol);
  return (
    <div className="velo" onClick={onCerrar}>
      <div className="hoja" onClick={(e) => e.stopPropagation()}>
        <h2>Crear usuario</h2>
        <div className="campos-opc">
          <input value={nombre} placeholder="Nombre y apellido" aria-label="Nombre"
            onChange={(e) => { setNombre(e.target.value); setError(null); }} />
          <select value={rol} aria-label="Rol"
            onChange={(e) => { setRol(e.target.value as Rol); setPin(""); setError(null); }}>
            {ROLES.map((r) => <option key={r} value={r}>{NOMBRE_ROL[r]}</option>)}
          </select>
        </div>
        <p className="ayuda">{QUE_HACE[rol]}</p>
        <TecladoPin valor={pin} onValor={(v) => { setPin(v); setError(null); }} largo={largo} />
        {error && <div className="aviso"><b>No se pudo crear</b><p>{error}</p></div>}
        <button type="button" className="btn btn-pri" disabled={nombre.trim().length < 3 || pin.length !== largo}
          onClick={async () => {
            const r = await crearUsuario({ nombre, rol, pin });
            if (!r.ok) { setError(r.error); return; }
            onListo(`${r.usuario.nombre} creado como ${NOMBRE_ROL[rol].toLowerCase()}`);
          }}>
          Crear
        </button>
        <button type="button" className="btn btn-sec btn-ch" onClick={onCerrar}>Cancelar</button>
      </div>
    </div>
  );
}

function HojaPin({ titulo, texto, largo, onListo, onCerrar }: {
  titulo: string; texto?: string; largo: number;
  onListo: (pin: string) => Promise<string | null>; onCerrar: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="velo" onClick={onCerrar}>
      <div className="hoja" onClick={(e) => e.stopPropagation()}>
        <h2>{titulo}</h2>
        {texto && <p>{texto}</p>}
        <TecladoPin valor={pin} onValor={(v) => { setPin(v); setError(null); }} largo={largo} />
        {error && <div className="aviso"><b>No se pudo</b><p>{error}</p></div>}
        <button type="button" className="btn btn-pri" disabled={pin.length !== largo}
          onClick={async () => { const e = await onListo(pin); if (e) { setError(e); setPin(""); } }}>
          Guardar
        </button>
        <button type="button" className="btn btn-sec btn-ch" onClick={onCerrar}>Cancelar</button>
      </div>
    </div>
  );
}
