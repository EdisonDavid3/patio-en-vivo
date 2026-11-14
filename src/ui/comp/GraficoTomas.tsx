import type { Lectura } from "../../datos/tipos";
import { formatearC, rango } from "../../dominio/temperatura";
import { horaFormato } from "../../dominio/tiempo";

type Props = {
  titulo: string;
  horas: readonly number[];
  tomas: (Lectura | null)[];
  /** Con producto se colorea por rango; en las demás etapas el color sería una falsa alarma. */
  conAlerta: boolean;
  limites?: { correctoHasta: number; urgenciaHasta: number };
};

const W = 330, H = 88, IZQ = 28, DER = 6, ARR = 15, ABA = 13;
const X0 = IZQ, X1 = W - DER, Y0 = ARR, Y1 = H - ABA;

/** Una línea con un punto por toma y su valor escrito, con las rayas de −18 y −15. */
export function GraficoTomas({ titulo, horas, tomas, conAlerta, limites }: Props) {
  const lim = limites ?? { correctoHasta: -18, urgenciaHasta: -15 };
  const nums = tomas.filter((t): t is Lectura => !!t && t.c !== null).map((t) => t.c!);
  const lo = Math.min(lim.correctoHasta - 4, ...nums) - 1;
  const hi = Math.max(lim.urgenciaHasta + 2, ...nums) + 1;
  const y = (c: number) => Y1 - ((c - lo) / Math.max(1, hi - lo)) * (Y1 - Y0);
  const x = (i: number) => X0 + (i * (X1 - X0)) / Math.max(1, horas.length - 1);
  const medio = (Y0 + Y1) / 2;

  // la línea solo une tomas numéricas seguidas
  const segmentos: string[] = [];
  let actual: string[] = [];
  tomas.forEach((t, i) => {
    if (t && t.c !== null) actual.push(`${x(i).toFixed(1)},${y(t.c).toFixed(1)}`);
    else { if (actual.length > 1) segmentos.push(actual.join(" ")); actual = []; }
  });
  if (actual.length > 1) segmentos.push(actual.join(" "));

  const claseDe = (c: number) => (conAlerta ? rango(c, lim) : "correcto");

  return (
    <div className="graf">
      <div className="graf-tit">
        <span>{titulo}</span>
        <span>{tomas.filter((t) => t).length} de {horas.length}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label={`${titulo}: ${tomas.filter((t) => t && t.c !== null).length} lecturas`}>
        <line className="reja" x1={X0} y1={Y1} x2={X1} y2={Y1} />
        <line className="ref18" x1={X0} y1={y(lim.correctoHasta)} x2={X1} y2={y(lim.correctoHasta)} />
        <text className="refrot" x={2} y={y(lim.correctoHasta) + 3} fill="var(--ok)">−18</text>
        <line className="ref15" x1={X0} y1={y(lim.urgenciaHasta)} x2={X1} y2={y(lim.urgenciaHasta)} />
        <text className="refrot" x={2} y={y(lim.urgenciaHasta) + 3} fill="var(--avi)">−15</text>

        {segmentos.map((p, i) => <polyline key={i} className="linea" points={p} />)}

        {tomas.map((t, i) => {
          const cx = x(i);
          if (!t) {
            return <circle key={i} className="pt-hueco" cx={cx} cy={medio} r={3.6} />;
          }
          if (t.c === null) {
            return (
              <g key={i}>
                <circle className="pt-cod" cx={cx} cy={medio} r={3.6} />
                <text className="val" x={cx} y={medio - 7} textAnchor="middle" fill="var(--nul)">{t.codigo}</text>
              </g>
            );
          }
          const cl = claseDe(t.c);
          return (
            <g key={i}>
              <circle className={"pt-" + cl} cx={cx} cy={y(t.c)} r={3.4} />
              <text className={"val val-" + cl} x={cx} y={y(t.c) - 6} textAnchor="middle">
                {formatearC(t.c)}
              </text>
            </g>
          );
        })}

        {horas.map((h, i) => (
          <text key={i} className="rot" x={x(i)} y={H - 3} textAnchor="middle">
            {horaFormato(h).replace(":00 ", " ").replace("a. m.", "a").replace("p. m.", "p")}
          </text>
        ))}
      </svg>
    </div>
  );
}
