import type { EstadoPosicion, Zona } from "../datos/tipos";
import { GRUPOS } from "../datos/zonas";
import { claseDe } from "./util";

type Props = {
  zonas: Zona[];
  lista: EstadoPosicion[];
  activa?: string | null;
  modo?: "patio" | "ronda";
  destacada?: string | null;
  apagada?: (e: EstadoPosicion) => boolean;
  onZona?: (id: string) => void;
  onPosicion?: (id: string) => void;
};

/**
 * El plano del patio en miniatura, con la disposición de la hoja:
 * E1 y E2 | Sector C | Sector B y Oficina | Sector A | Patio Nuevo.
 * Cada posición es un cuadrito de color, sin texto. Caben las 115.
 */
export function MiniPlano({ zonas, lista, activa, modo = "patio", destacada, apagada, onZona, onPosicion }: Props) {
  const porZona = new Map<string, EstadoPosicion[]>();
  for (const e of lista) {
    const a = porZona.get(e.posicion.zonaId);
    if (a) a.push(e); else porZona.set(e.posicion.zonaId, [e]);
  }
  return (
    <div className="mini">
      {GRUPOS.map((g) => (
        <div className="mini-col" key={g}>
          {zonas.filter((z) => z.grupo === g).map((z) => (
            <button
              key={z.id}
              type="button"
              className={"mini-z" + (activa === z.id ? " aqui" : "")}
              onClick={() => onZona?.(z.id)}
              aria-label={z.nombre}
            >
              <em>{z.id === "OF" ? "OFIC" : z.id}</em>
              <div className="mini-rej" style={{ gridTemplateColumns: `repeat(${z.colsTel}, var(--cua))` }}>
                {(porZona.get(z.id) ?? []).map((e) => {
                  const cl = claseDe(e);
                  const pend = modo === "ronda" && e.cuentaEnRonda && !e.medidaEnRonda;
                  return (
                    <i
                      key={e.posicion.id}
                      className={
                        "cua " + cl +
                        (pend ? " pendiente" : "") +
                        (apagada?.(e) ? " apagado" : "") +
                        (destacada === e.posicion.id ? " late" : "")
                      }
                      title={e.posicion.id.replace("-", " ")}
                      onClick={(ev) => { if (onPosicion) { ev.stopPropagation(); onPosicion(e.posicion.id); } }}
                    />
                  );
                })}
              </div>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
