import { useEffect, useLayoutEffect, useState } from "react";

export type PantallaTutorial = "patio" | "llegada" | "ronda" | "buscar" | "reporte";

type Paso = {
  pantalla?: PantallaTutorial;
  foco?: string;
  /** Qué tocar para que el objetivo exista: la ronda y la llegada empiezan pidiendo dónde estás. */
  prepara?: string;
  emoji: string;
  titulo: string;
  texto: string;
};

const PASOS: Paso[] = [
  { emoji: "👋", titulo: "¡Hola!",
    texto: "Esto reemplaza las dos hojas del patio. Te lo enseño en un minuto y puedes salirte cuando quieras." },
  { pantalla: "patio", foco: ".plano-caja", emoji: "🗺️", titulo: "El patio entero",
    texto: "Cada cuadrito es una posición. Son las 115, puestas en el mismo lugar que en la hoja de papel." },
  { pantalla: "patio", foco: ".ley", emoji: "🎨", titulo: "Qué dice cada color",
    texto: "Verde correcto, amarillo urgencia y rojo alerta. Gris es un contenedor vacío, turquesa uno enfriando y violeta uno cargando. Un cuadrito rojo siempre es un problema de verdad." },
  { pantalla: "patio", foco: ".mini", emoji: "👆", titulo: "Toca tu sección",
    texto: "Al tocarla se abre abajo y queda marcada en azul: ahí estás. También puedes deslizar de lado para pasar a la siguiente." },
  { pantalla: "patio", foco: ".lista .fila", emoji: "🔢", titulo: "El contenedor manda",
    texto: "El número va grande, con los cuatro dígitos con los que lo nombras resaltados. La posición va debajo, chiquita." },
  { pantalla: "patio", foco: ".res1", emoji: "🧮", titulo: "El resumen",
    texto: "Ocupadas, libres, en urgencia y en alerta. Solo cuenta los contenedores a los que hay que tomarles temperatura: los vacíos no." },
  { pantalla: "ronda", foco: ".r-lista", prepara: ".tira button:not([disabled])", emoji: "🌡️", titulo: "La ronda",
    texto: "Arriba ves la que ya mediste con su valor, la tuya resaltada y las que siguen. Nada salta: solo baja el resaltado." },
  { pantalla: "ronda", foco: ".teclas", prepara: ".tira button:not([disabled])", emoji: "➖", titulo: "El menos ya viene puesto",
    texto: "Escribe 18 y se guarda −18. Tres toques por lectura: dos números y guardar." },
  { pantalla: "ronda", foco: ".r-botones", prepara: ".tira button:not([disabled])", emoji: "⏭️", titulo: "Los tres botones",
    texto: "La flecha ← vuelve a la anterior. El grande guarda y baja. La ✕ es para cuando no pudiste medir: ahí eliges el motivo." },
  { pantalla: "llegada", foco: ".tec-iso", prepara: ".pos-sel button:not([disabled])", emoji: "🚛", titulo: "Cuando llega uno nuevo",
    texto: "Escribes las 4 letras y el teclado cambia solo a números. La temperatura es opcional: casi siempre llegan vacíos." },
  { pantalla: "reporte", foco: ".rep-env", emoji: "📋", titulo: "Lo que recibe la jefa",
    texto: "El formato de siempre, armado solo con lo que registraste. Mínimo, máximo y promedio salen calculados." },
  { emoji: "🎉", titulo: "¡Listo!",
    texto: "Estás en modo de prueba: todos los datos son inventados, así que toca lo que quieras sin miedo. Con el botón 🧪 de arriba vuelves a ver esto o empiezas de cero." },
];

type Recuadro = { top: number; left: number; width: number; height: number };

export function Tutorial({ onCerrar, irA }: { onCerrar: () => void; irA: (p: PantallaTutorial) => void }) {
  const [n, setN] = useState(0);
  const [caja, setCaja] = useState<Recuadro | null>(null);
  const paso = PASOS[n]!;

  useEffect(() => { if (paso.pantalla) irA(paso.pantalla); }, [n, paso.pantalla, irA]);

  useLayoutEffect(() => {
    let vivo = true;
    const relojes: ReturnType<typeof setTimeout>[] = [];

    function medir() {
      if (!vivo) return;
      if (!paso.foco) { setCaja(null); return; }
      const el = document.querySelector(paso.foco);
      if (!el) { setCaja(null); return; }
      el.scrollIntoView({ block: "nearest" });
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) { setCaja(null); return; }
      setCaja({ top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 });
    }

    function preparar() {
      if (!vivo) return;
      if (paso.prepara && paso.foco && !document.querySelector(paso.foco)) {
        const abre = document.querySelector<HTMLElement>(paso.prepara);
        if (abre) {
          abre.click();
          relojes.push(setTimeout(medir, 380));
          // segunda pasada: algunos paneles terminan de acomodarse un poco después
          relojes.push(setTimeout(medir, 760));
          return;
        }
      }
      medir();
      relojes.push(setTimeout(medir, 380));
    }

    relojes.push(setTimeout(preparar, 280));
    globalThis.addEventListener("resize", medir);
    return () => {
      vivo = false;
      for (const t of relojes) clearTimeout(t);
      globalThis.removeEventListener("resize", medir);
    };
  }, [n, paso.foco, paso.prepara]);

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
      if (e.key === "ArrowRight") setN((x) => Math.min(PASOS.length - 1, x + 1));
      if (e.key === "ArrowLeft") setN((x) => Math.max(0, x - 1));
    };
    globalThis.addEventListener("keydown", f);
    return () => globalThis.removeEventListener("keydown", f);
  }, [onCerrar]);

  const ultimo = n === PASOS.length - 1;
  // la burbuja va debajo del recuadro si cabe; si no, arriba
  const abajo = caja ? caja.top + caja.height + 190 < globalThis.innerHeight : false;
  const estiloBurbuja = caja
    ? abajo
      ? { top: caja.top + caja.height + 10 }
      : { bottom: globalThis.innerHeight - caja.top + 10 }
    : {};

  return (
    <div className="tut" role="dialog" aria-label={`Tutorial, paso ${n + 1} de ${PASOS.length}`}>
      {caja ? (
        <>
          <div className="tut-sombra" style={{ top: 0, left: 0, right: 0, height: Math.max(0, caja.top) }} />
          <div className="tut-sombra" style={{ top: caja.top + caja.height, left: 0, right: 0, bottom: 0 }} />
          <div className="tut-sombra" style={{ top: caja.top, left: 0, width: Math.max(0, caja.left), height: caja.height }} />
          <div className="tut-sombra" style={{ top: caja.top, left: caja.left + caja.width, right: 0, height: caja.height }} />
          <div className="tut-marco" style={{ top: caja.top, left: caja.left, width: caja.width, height: caja.height }} />
        </>
      ) : (
        <div className="tut-sombra" style={{ inset: 0 }} />
      )}

      <div className={"tut-burbuja" + (caja ? "" : " centro")} style={estiloBurbuja}>
        <div className="tut-cab">
          <span className="tut-emoji">{paso.emoji}</span>
          <b>{paso.titulo}</b>
          <button type="button" className="tut-x" onClick={onCerrar} aria-label="Salir del tutorial">✕</button>
        </div>
        <p>{paso.texto}</p>
        <div className="tut-puntos">
          {PASOS.map((_, k) => (
            <i key={k} className={k === n ? "aqui" : k < n ? "visto" : ""} />
          ))}
        </div>
        <div className="tut-botones">
          <button type="button" className="btn btn-sec btn-ch" disabled={n === 0} onClick={() => setN(n - 1)}>
            Atrás
          </button>
          {ultimo ? (
            <button type="button" className="btn btn-pri btn-ch" onClick={onCerrar}>¡Entendido!</button>
          ) : (
            <button type="button" className="btn btn-pri btn-ch" onClick={() => setN(n + 1)}>
              Siguiente · {n + 1}/{PASOS.length}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
