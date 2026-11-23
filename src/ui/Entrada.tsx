import { useEffect, useState } from "react";
import type { Usuario } from "../datos/tipos";
import { abrirSesion, comprobarPin, crearUsuario, listarUsuarios } from "../datos/usuarios";
import { TecladoPin } from "./comp/TecladoPin";
import { largoPin, NOMBRE_ROL, pinSiempre } from "../dominio/permisos";

/**
 * Entrar al aparato. Si no hay nadie registrado —un teléfono recién abierto por el QR—
 * lo primero que se pide es el nombre y un PIN de 4 números, y queda creado como patero.
 */
export function Entrada({ onEntro }: { onEntro: (u: Usuario) => void }) {
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [elegido, setElegido] = useState<Usuario | null>(null);
  const [pin, setPin] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [intentos, setIntentos] = useState(0);

  useEffect(() => { void listarUsuarios().then((us) => setUsuarios(us.filter((u) => u.activo))); }, []);

  if (!usuarios) return <p className="sin-datos">Un momento…</p>;

  // ---- teléfono nuevo: se crea el primer usuario
  if (usuarios.length === 0) {
    const listo = nombre.trim().length >= 3 && pin.length === 4;
    return (
      <div className="entrada">
        <div className="entrada-cab">
          <span className="entrada-logo">🧊</span>
          <h1>Patio en Vivo</h1>
          <p>Total Seafood</p>
        </div>
        <div className="campo">
          <label htmlFor="nom">Tu nombre completo</label>
          <input id="nom" className="entrada-input" value={nombre} autoComplete="name"
            placeholder="Nombre y apellido" onChange={(e) => { setNombre(e.target.value); setError(null); }} />
        </div>
        <div className="campo">
          <label>Inventa tu PIN de 4 números</label>
          <p className="ayuda" style={{ marginTop: 0 }}>Es el que vas a usar cada vez que entres. No lo compartas.</p>
          <TecladoPin valor={pin} onValor={(v) => { setPin(v); setError(null); }} largo={4} />
        </div>
        {error && <div className="aviso"><b>No se pudo crear</b><p>{error}</p></div>}
        <button type="button" className="btn btn-pri" disabled={!listo}
          onClick={async () => {
            const r = await crearUsuario({ nombre, rol: "patero", pin });
            if (!r.ok) { setError(r.error); return; }
            await abrirSesion(r.usuario.id);
            onEntro(r.usuario);
          }}>
          Crear mi usuario y entrar
        </button>
        <p className="ayuda" style={{ textAlign: "center" }}>
          Quedas registrado como <b>patero</b>. Si necesitas otro rol, pídeselo al administrador.
        </p>
      </div>
    );
  }

  // ---- elegir quién entra
  if (!elegido) {
    return (
      <div className="entrada">
        <div className="entrada-cab">
          <span className="entrada-logo">🧊</span>
          <h1>¿Quién eres?</h1>
        </div>
        <div className="entrada-lista">
          {usuarios.map((u) => (
            <button key={u.id} type="button" className="entrada-u"
              onClick={() => { setElegido(u); setPin(""); setError(null); }}>
              <span className="entrada-ini">{u.nombre.slice(0, 1).toUpperCase()}</span>
              <span>
                <b>{u.nombre}</b>
                <span className={"etapa " + (u.rol === "administrador" ? "cargando" : u.rol === "patero" ? "con_producto" : "vacio")}>
                  {NOMBRE_ROL[u.rol]}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---- PIN
  const largo = largoPin(elegido.rol);
  const bloqueado = intentos >= 5;
  return (
    <div className="entrada">
      <div className="entrada-cab">
        <span className="entrada-ini grande">{elegido.nombre.slice(0, 1).toUpperCase()}</span>
        <h1>{elegido.nombre}</h1>
        <p>{NOMBRE_ROL[elegido.rol]} · PIN de {largo} números</p>
      </div>
      {pinSiempre(elegido.rol) && (
        <p className="ayuda" style={{ textAlign: "center" }}>
          Al administrador se le pide el PIN cada vez que entra.
        </p>
      )}
      <TecladoPin valor={pin} onValor={(v) => { setPin(v); setError(null); }} largo={largo} />
      {error && <div className="aviso"><b>No se pudo entrar</b><p>{error}</p></div>}
      {bloqueado && (
        <div className="aviso"><b>Demasiados intentos</b>
          <p>Espera un momento o pídele al administrador que te ponga un PIN nuevo.</p></div>
      )}
      <button type="button" className="btn btn-pri" disabled={pin.length !== largo || bloqueado}
        onClick={async () => {
          const r = await comprobarPin(elegido.id, pin);
          if (!r.ok) { setError(r.error); setPin(""); setIntentos((n) => n + 1); return; }
          await abrirSesion(r.usuario.id);
          onEntro(r.usuario);
        }}>
        Entrar
      </button>
      <button type="button" className="btn btn-sec btn-ch" onClick={() => { setElegido(null); setPin(""); setError(null); }}>
        No soy yo
      </button>
    </div>
  );
}
