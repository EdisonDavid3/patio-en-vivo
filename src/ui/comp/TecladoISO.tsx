const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NUMEROS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Teclado propio para el número de contenedor. Cambia solo de letras a números
 * después de la cuarta letra: el teclado del teléfono no lo hace de forma fiable.
 */
export function TecladoISO({ valor, onValor }: { valor: string; onValor: (v: string) => void }) {
  const letras = valor.length < 4;
  const escribir = (c: string) => { if (valor.length < 11) onValor(valor + c); };
  const borrar = () => onValor(valor.slice(0, -1));

  if (letras) {
    return (
      <div className="tec-iso letras">
        {LETRAS.map((l) => (
          <button key={l} type="button" onClick={() => escribir(l)}>{l}</button>
        ))}
        <button type="button" className="borrar" onClick={borrar} aria-label="Borrar">⌫</button>
      </div>
    );
  }
  return (
    <div className="tec-iso numeros">
      {NUMEROS.map((n) => (
        <button key={n} type="button" onClick={() => escribir(n)}>{n}</button>
      ))}
      <button type="button" className="borrar" onClick={borrar} aria-label="Borrar">⌫</button>
      <button type="button" onClick={() => escribir("0")}>0</button>
      <button type="button" className="borrar" onClick={() => onValor("")} aria-label="Empezar de nuevo">✕</button>
    </div>
  );
}

/** El número como se lee en el patio, con lo que falta en blanco: MSCU 128___ _ */
export function NumeroEnProceso({ valor }: { valor: string }) {
  const hueco = (desde: number, hasta: number) =>
    Array.from({ length: hasta - desde }, (_, k) => (valor[desde + k] ?? null));
  const trozo = (chars: (string | null)[], clave = false) =>
    chars.map((c, k) => (
      <span key={k} className={c === null ? "falta" : clave ? "clave" : undefined}>{c ?? "_"}</span>
    ));
  return (
    <div className="num-proceso" aria-label={valor || "sin número"}>
      {trozo(hueco(0, 4))}
      <span className="esp" />
      {trozo(hueco(4, 6))}
      {trozo(hueco(6, 10), true)}
      <span className="esp" />
      {trozo(hueco(10, 11))}
    </div>
  );
}
