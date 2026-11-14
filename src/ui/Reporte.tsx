import { useEffect, useState } from "react";
import { armarReporte, diasConDatos, type Reporte as Rep } from "../datos/repo";
import { esNumero } from "../dominio/calculos";
import { fechaCorta, horaFormato, HORAS_FIJAS, instante, ranurasDelDia, hhmm } from "../dominio/tiempo";
import { formatearC, rango } from "../dominio/temperatura";

const POR_HOJA = 10;

export function Reporte() {
  const [dias, setDias] = useState<string[]>([]);
  const [dia, setDia] = useState<string>("");
  const [rep, setRep] = useState<Rep | null>(null);
  const [hoja, setHoja] = useState(0);

  useEffect(() => {
    void diasConDatos().then((ds) => {
      setDias(ds);
      setDia((d) => d || ds[0] || "");
    });
  }, []);
  useEffect(() => {
    if (!dia) return;
    void armarReporte(dia).then((r) => { setRep(r); setHoja(0); });
  }, [dia]);

  if (!rep) return <p className="vacio">Cargando el reporte…</p>;

  const hojas = Math.max(1, Math.ceil(rep.filas.length / POR_HOJA));
  const filas = rep.filas.slice(hoja * POR_HOJA, (hoja + 1) * POR_HOJA);
  const [a, m, d] = dia.split("-").map(Number) as [number, number, number];
  const fecha = fechaCorta(instante(a, m, d, 12));
  const ranuras = ranurasDelDia(dia);

  return (
    <div className="pc">
      <div className="rep-barra">
        <label htmlFor="dia"><b>Día operativo</b></label>
        <select id="dia" value={dia} onChange={(e) => setDia(e.target.value)}>
          {dias.map((x) => {
            const [y, mm, dd] = x.split("-").map(Number) as [number, number, number];
            return <option key={x} value={x}>{fechaCorta(instante(y, mm, dd, 12))} · 08:00 → 06:00</option>;
          })}
        </select>
        <span style={{ color: "var(--tinta2)" }}>
          Hoja {hoja + 1} de {hojas} · contenedores {hoja * POR_HOJA + 1} a {Math.min((hoja + 1) * POR_HOJA, rep.filas.length)} de {rep.filas.length}
        </span>
        <button type="button" disabled={hoja === 0} onClick={() => setHoja((h) => h - 1)}>‹ Anterior</button>
        <button type="button" disabled={hoja >= hojas - 1} onClick={() => setHoja((h) => h + 1)}>Siguiente ›</button>
        <button type="button" onClick={() => globalThis.print()} style={{ marginLeft: "auto" }}>🖶 Imprimir</button>
      </div>

      <div className="turnos-ley">
        <span><i style={{ background: "var(--sup)" }} />Turno día · 8:00 a. m. a 6:00 p. m.</span>
        <span><i style={{ background: "var(--sup3)" }} />Turno noche · 8:00 p. m. a 6:00 a. m.</span>
      </div>

      <div className="rep-env">
        <div className="hoja-of">
          <div className="hoja-cab">
            <div className="marca-ts">
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Total Seafood" height={38} />
            </div>
            <div className="t">
              <b>CÁMARA DE ALMACENAMIENTO DE CONGELADO</b>
              <span>Control de contenedores y registro de temperaturas</span>
            </div>
          </div>
          <div className="hoja-meta">
            <div><b>FECHA:</b> {fecha}</div>
            <div><b>RESPONSABLE TURNO DÍA:</b> {rep.responsables.dia}</div>
            <div><b>RESPONSABLE TURNO NOCHE:</b> {rep.responsables.noche}</div>
          </div>
          <div className="hoja-nota">
            Temperatura en °C | Rango aceptable: −18 °C o más frío | Toda lectura fuera de rango está encerrada y anotada en Observaciones
          </div>

          <table className="rep">
            <thead>
              <tr>
                <th className="et">N.º</th>
                {Array.from({ length: POR_HOJA }, (_, i) => <th key={i}>{hoja * POR_HOJA + i + 1}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr><td className="et">Contenedor</td>{filas.map((f) => <td key={f.estadiaId} className="cn">{f.numero}</td>)}
                {relleno(filas.length)}</tr>
              <tr><td className="et">Ubicación</td>{filas.map((f) => <td key={f.estadiaId}>{f.ubicacion}</td>)}{relleno(filas.length)}</tr>
              <tr><td className="et">Producto</td>{filas.map((f) => <td key={f.estadiaId}>{f.producto || "—"}</td>)}{relleno(filas.length)}</tr>
              <tr><td className="et">Sello</td>{filas.map((f) => <td key={f.estadiaId}>{f.sello || "—"}</td>)}{relleno(filas.length)}</tr>
              <tr><td className="et">Estado</td>{filas.map((f) => <td key={f.estadiaId}>{f.estado || "—"}</td>)}{relleno(filas.length)}</tr>
              <tr><td className="et">Hora ingreso</td>
                {filas.map((f) => <td key={f.estadiaId}>{f.ingreso ? hhmm(f.ingreso) : "—"}</td>)}{relleno(filas.length)}</tr>
              <tr><td className="et">Hora salida</td>
                {filas.map((f) => <td key={f.estadiaId}>{f.salida ? hhmm(f.salida) : "—"}</td>)}{relleno(filas.length)}</tr>
              <tr>
                <td className="et" style={{ background: "var(--azul)", color: "#fff" }}>Hora</td>
                <td colSpan={POR_HOJA} style={{ background: "var(--azul)", color: "#fff", fontWeight: 650 }}>
                  LECTURAS DE TEMPERATURA (°C)
                </td>
              </tr>
              {HORAS_FIJAS.map((h, i) => (
                <tr key={i} className={i < 6 ? "dia" : "noche"}>
                  <td className="et">{horaFormato(h)}</td>
                  {filas.map((f) => {
                    const c = f.celdas[i];
                    if (c === null || c === undefined) {
                      const pendiente = ranuras[i]! > Date.now();
                      return <td key={f.estadiaId} className={pendiente ? "" : "v-sin"}>{pendiente ? "" : "—"}</td>;
                    }
                    if ("codigo" in c) return <td key={f.estadiaId} className="v-codigo">{c.codigo}</td>;
                    return <td key={f.estadiaId} className={"v-" + rango(c.c)}>{formatearC(c.c)}</td>;
                  })}
                  {relleno(filas.length)}
                </tr>
              ))}
              <tr className="calc"><td className="et">Mínimo</td>
                {filas.map((f) => <td key={f.estadiaId}>{f.resumen ? formatearC(f.resumen.min) : "—"}</td>)}{relleno(filas.length)}</tr>
              <tr className="calc"><td className="et">Máximo</td>
                {filas.map((f) => <td key={f.estadiaId}>{f.resumen ? formatearC(f.resumen.max) : "—"}</td>)}{relleno(filas.length)}</tr>
              <tr className="calc"><td className="et">Promedio</td>
                {filas.map((f) => <td key={f.estadiaId}>{f.resumen ? formatearC(f.resumen.prom) : "—"}</td>)}{relleno(filas.length)}</tr>
            </tbody>
          </table>

          <div className="hoja-ley">
            Leyenda ESTADO / lecturas: C = Cargando · D = Despachado · E = En espera · SE = Sin energía · V = Vacío ·
            Se usa el código en la celda cuando no se pudo tomar la lectura.
          </div>
          <div className="hoja-pie">
            <div>
              <b>Observaciones</b>
              {rep.observaciones.length === 0
                ? <div className="ln">Sin novedades.</div>
                : rep.observaciones.map((o, i) => <div className="ln" key={i}>{hhmm(o.ms)} · {o.texto}</div>)}
            </div>
            <div><b>Turno día</b>
              <div className="ln">Nombre: {rep.responsables.dia}</div>
              <div className="ln">Hora de entrega de turno: 7:05 p. m.</div></div>
            <div><b>Turno noche</b>
              <div className="ln">Nombre: {rep.responsables.noche}</div>
              <div className="ln">Hora de entrega de turno: 7:10 a. m.</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function relleno(n: number) {
  if (n >= POR_HOJA) return null;
  return Array.from({ length: POR_HOJA - n }, (_, i) => <td key={"v" + i} />);
}
