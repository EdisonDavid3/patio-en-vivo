import { useEffect, useState } from "react";
import { ultimosMovimientos, type Movimiento } from "../../datos/repo";
import { hhmmAmPm, fechaCorta, diaOperativo } from "../../dominio/tiempo";

/**
 * Lo último que pasó en el patio: hora, quién y qué. Se abre como hoja para no
 * robarle sitio a la lista de la sección en el teléfono.
 */
export function Movimientos({ refresco, estilo = "chip" }: {
  refresco: unknown; estilo?: "chip" | "barra";
}) {
  const [abierto, setAbierto] = useState(false);
  const [movs, setMovs] = useState<Movimiento[]>([]);

  useEffect(() => {
    if (!abierto) return;
    void ultimosMovimientos(50).then(setMovs);
  }, [abierto, refresco]);

  const hoy = diaOperativo(Date.now());

  return (
    <>
      <button type="button" className={estilo === "chip" ? "movs-chip" : "vivo"}
        onClick={() => setAbierto(true)} title="Últimos movimientos"
        aria-label="Últimos movimientos">
        🕑{estilo === "barra" && " Últimos movimientos"}
      </button>

      {abierto && (
        <div className="velo" onClick={() => setAbierto(false)}>
          <div className="hoja" onClick={(e) => e.stopPropagation()}>
            <h2>🕑 Últimos movimientos</h2>
            <p>Quién hizo qué en este aparato, de lo más nuevo a lo más viejo.</p>
            <div className="movs-lista">
              {movs.length === 0 && <p className="sin-datos">Todavía no hay movimientos.</p>}
              {movs.map((m) => (
                <div key={m.id} className="mov">
                  <span className="mov-hora">
                    {hhmmAmPm(m.ms)}
                    {diaOperativo(m.ms) !== hoy && <i>{fechaCorta(m.ms)}</i>}
                  </span>
                  <span className="mov-txt"><b>{m.quien}</b> {m.texto}</span>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-sec" onClick={() => setAbierto(false)}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  );
}
