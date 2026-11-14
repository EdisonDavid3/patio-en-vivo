import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import { sembrarSiHaceFalta } from "./datos/semilla";
import "./estilos.css";

async function arrancar() {
  // iPhone: hay que pedirlo en cada apertura para que no borren los datos guardados.
  try { await navigator.storage?.persist?.(); } catch { /* el navegador puede negarse */ }
  await sembrarSiHaceFalta();
  createRoot(document.getElementById("raiz")!).render(<App />);
}

void arrancar();
