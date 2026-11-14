# Patio en Vivo — Total Seafood

Hoja de patio y control de temperaturas de contenedores refrigerados, en una página web
que **funciona sin señal**. Reemplaza dos formatos en papel:

1. **Hoja de patio** — qué contenedor hay en cada una de las 115 posiciones.
2. **Control de contenedores y registro de temperaturas** — la temperatura cada 2 horas,
   con mínimo, máximo, promedio, observaciones y responsables de turno.

> **Fase 0 — demostración.** Todo ocurre dentro del teléfono: no hay servidor, no hay cuentas
> y **no hay un solo dato real de la empresa**. Los contenedores son inventados, con números
> que sí cumplen la norma ISO 6346.

## Cómo abrirla

Entra al link desde el navegador del celular o de la PC. No hay que descargar nada.
En iPhone hay que **agregarla a la pantalla de inicio** (ver abajo).

## Qué se puede hacer

| Pantalla | Qué hace |
|---|---|
| **Patio** | En PC, la hoja completa con las siete tablas en el mismo lugar que el papel, con modo pantalla completa para dejarla puesta en la oficina. En teléfono, un mini-plano fijo con las 115 posiciones como cuadritos de color; al tocar una sección se abre debajo. |
| **Llegada** | Número de contenedor (ISO 6346 completo, obligatorio) y temperatura. Producto, sello y estado son opcionales. |
| **Ronda** | Modo guiado: solo pide la temperatura. Muestra la lectura anterior, deja volver atrás y marca en el plano lo medido y lo pendiente. |
| **Detalle** | Mover, salida, corregir e historial de una posición ocupada. |
| **Buscar** | Por los últimos dígitos. Parpadea la posición en el plano. |
| **Reportes** | El formato oficial de temperaturas, por día operativo, 10 contenedores por hoja, listo para imprimir. |

## Reglas que no se negocian

- **Día operativo**: de las 08:00 a las 06:00 del día siguiente, con el corte a las 07:00.
  Mínimos, máximos, promedios y reportes usan ese día, no el calendario.
- **Horas fijas**: 08, 10, 12, 14, 16, 18, 20, 22, 00, 02, 04 y 06.
- **Mover de posición no reinicia el tiempo en patio.**
- **Mínimo, máximo y promedio ignoran las celdas con código** (C, D, E, SE, V).
- **El número de contenedor va completo**: 4 letras + 7 dígitos. Si el dígito verificador no
  cuadra, se avisa y se puede guardar con advertencia; queda marcado en rojo para revisión.
- Zona horaria `America/Guayaquil`, °C, pantalla en 24 h y reporte en a. m. / p. m.

## Para programadores

```bash
npm install
npm run dev      # servidor de desarrollo
npm test         # pruebas del dominio y de la capa de datos
npm run tipos    # revisión de tipos
npm run build    # construye en dist/
```

- **React 19 + Vite 8 + TypeScript 7**, como PWA.
- **Dexie 4 sobre IndexedDB**: todo se guarda primero en el teléfono.
- **`src/dominio/`** — lógica pura y probada: ISO 6346, día operativo, rangos, cálculos.
- **`src/datos/repo.ts`** — la única capa de datos. Las pantallas nunca tocan Dexie
  directamente, para poder cambiar a un servidor sin tocar las pantallas.
- **`src/ui/`** — las pantallas.
- Sin tipografías externas ni llamadas a otros sitios: la página abre sin señal desde el principio.

## iPhone: hay que agregarla a la pantalla de inicio

Safari borra los datos guardados por una web después de 7 días sin usarla. Las webs que están
en la pantalla de inicio quedan **exentas** de esa regla y tienen su propio contador, que se
reinicia cada vez que se abren. La app además pide `navigator.storage.persist()` en cada
apertura. En Android con Chrome es opcional.

**Regla para los pateros, en cualquier teléfono: no terminar el turno con registros sin enviar.**

## Documentos

- `PLAN.md` — el plan completo y las decisiones.
- `CLAUDE.md` — contexto para retomar el trabajo.
- `docs/formatos/` — los dos formatos oficiales en PDF y el logo.
- `docs/propuesta-pantallas.html` — la propuesta visual aprobada.
