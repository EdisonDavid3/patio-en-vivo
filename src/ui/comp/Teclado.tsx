type Props = {
  valor: string;
  onValor: (v: string) => void;
  negativo: boolean;
  onSigno: () => void;
  compacto?: boolean;
};

const TECLAS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** Teclado numérico con el signo menos puesto por defecto. */
export function Teclado({ valor, onValor, negativo, onSigno, compacto }: Props) {
  const escribir = (t: string) => {
    if (t === ",") {
      if (valor.includes(",") || valor === "") return;
      onValor(valor + ",");
      return;
    }
    const partes = valor.split(",");
    if (partes.length === 2 && partes[1]!.length >= 1) return; // un decimal basta
    if (partes[0]!.length >= 2 && partes.length === 1) {
      onValor(valor.slice(1) + t);
      return;
    }
    onValor(valor + t);
  };
  return (
    <div className={"teclas" + (compacto ? " compacto" : "")}>
      {TECLAS.map((t) => (
        <button key={t} type="button" onClick={() => escribir(t)}>{t}</button>
      ))}
      <button type="button" className="chica" onClick={onSigno} aria-label="Cambiar el signo">
        {negativo ? "+ / −" : "− / +"}
      </button>
      <button type="button" onClick={() => escribir("0")}>0</button>
      <button type="button" className="chica" onClick={() => escribir(",")} aria-label="Coma decimal">,</button>
    </div>
  );
}
