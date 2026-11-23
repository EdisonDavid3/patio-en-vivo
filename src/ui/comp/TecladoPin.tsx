const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function TecladoPin({ valor, onValor, largo }: {
  valor: string; onValor: (v: string) => void; largo: number;
}) {
  const escribir = (d: string) => { if (valor.length < largo) onValor(valor + d); };
  return (
    <>
      <div className="pin-puntos" aria-label={`${valor.length} de ${largo} números`}>
        {Array.from({ length: largo }, (_, i) => (
          <i key={i} className={i < valor.length ? "lleno" : ""} />
        ))}
      </div>
      <div className="tec-iso numeros">
        {TECLAS.map((t) => <button key={t} type="button" onClick={() => escribir(t)}>{t}</button>)}
        <button type="button" className="borrar" onClick={() => onValor("")} aria-label="Empezar de nuevo">✕</button>
        <button type="button" onClick={() => escribir("0")}>0</button>
        <button type="button" className="borrar" onClick={() => onValor(valor.slice(0, -1))} aria-label="Borrar">⌫</button>
      </div>
    </>
  );
}
