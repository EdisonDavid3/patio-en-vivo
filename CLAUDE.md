# CLAUDE.md — Patio en Vivo (Total Seafood)

Contexto para retomar el proyecto en sesiones futuras. **Mantener actualizado.**
Última actualización: 14-nov-2026.

---

## Qué es
Página web (PWA) que reemplaza dos formatos en papel del patio de contenedores refrigerados de
Total Seafood (empacadora/exportadora de camarón congelado, Ecuador):
1. **Hoja de patio** — qué contenedor hay en cada posición (2 veces al día, turno día y noche).
2. **Control de contenedores y registro de temperaturas** — temperatura cada 2 horas, con mínimo,
   máximo, promedio, observaciones y responsables de turno. Se entrega diariamente a la jefa.

Documento maestro del plan: `PLAN.md`. Formatos originales en `docs/formatos/`.

## Cómo trabajar con Edison
- **No es programador.** Explicar todo en lenguaje sencillo y guiarlo paso a paso en lo que él deba hacer.
- Antes de codificar: preguntar lo que cambie el diseño → plan → aprobación.
- Trabajar por fases; al cerrar cada una, decirle **qué probar y cómo**.
- **Verificar versiones y APIs en la documentación actual.** No asumirlas de memoria.
- Cuenta de GitHub conectada: `EdisonDavid3`.

---

## Decisiones cerradas

| # | Decisión | Fecha |
|---|---|---|
| D1 | **Número de contenedor: ISO 6346 completo obligatorio** (4 letras + 7 dígitos). No se admiten 4 dígitos. | 14-nov |
| D2 | **Dígito verificador que no cuadra → "botón rojo"**: se explica el error y se ofrece *"Revisé y está bien, guardar igual"*; la posición queda marcada en rojo para revisión del supervisor. No es bloqueo absoluto. | 14-nov |
| D3 | **Lecturas imposibles de tomar se guardan como código** C/D/E/SE/V con motivo. Además el supervisor puede marcar un contenedor entero como *sin energía* o *vacío* y la app deja de pedirle temperatura. | 14-nov |
| D4 | **Importar lista de contenedores esperados: Fase 2.** Fases 0 y 1 a mano con autocompletado. Modelo de datos ya preparado. | 14-nov |
| D5 | **Firmas: solo nombre y hora de entrega de turno.** Sin espacio de firma ni firma dibujada. | 14-nov |
| D6 | **Encabezado del reporte: se eliminan Código, Versión y Página.** Queda logo, título y fecha. | 14-nov |
| D7 | **Publicación: GitHub Pages.** Cloudflare Pages descartado (era comodidad, no necesidad). | 14-nov |
| D8 | **PIN nunca viaja al servidor.** Activación del teléfono con código de un solo uso del supervisor; el PIN solo descifra la credencial local. | 14-nov |
| D9 | **Impresión en A4 y carta.** El formato oficial original es carta horizontal; A4 por defecto. | 14-nov |
| D10 | **Colores en pantalla: 3 rangos** (verde / amarillo -18 a -15 / rojo > -15). **En el papel impreso: criterio del formato oficial** (fuera de rango = más caliente que -18). Configurable. | 14-nov |
| D11 | **La vista principal del patio es la hoja viva**, con la disposición del PDF modelo. En PC/tablet: plano completo con las 7 tablas, para dejarlo abierto en la oficina actualizándose solo. En teléfono: **mini-plano fijo arriba** con las 115 posiciones como cuadritos de color sin texto; al tocar una sección se abre debajo y queda resaltada como «estás aquí»; deslizar pasa a la sección vecina; el zoom con los dedos sobre la hoja completa es solo vista de consulta en horizontal. | 14-nov |
| D12 | **Filtros «Solo alertas» y «Sin tomar en esta ronda»** en teléfono y en PC. | 14-nov |
| D13 | El rango -18 a -15 se llama **«Urgencia»**, no «Aceptable». | 14-nov |
| D14 | **Registrar llegada exige temperatura** además del contenedor. Mismo teclado que la ronda. | 14-nov |
| D15 | **Reporte: los turnos se distinguen con dos grises neutros.** El amarillo queda solo para las lecturas en urgencia. | 14-nov |
| D16 | **Ronda: se muestra la lectura anterior** (valor y hora), hay **botón para volver a la posición anterior**, y el mini-plano marca medidas y pendientes. | 14-nov |
| D17 | **Orden de la ronda sin pantalla de configuración**: el patero empieza tocando la sección donde está; dentro va ascendente con botón «Empezar por el final»; al terminar, la app sugiere la siguiente pendiente con un botón grande pero puede tocar cualquier otra; **la app recuerda el orden habitual de cada patero** (preferencia guardada en `usuarios`) y lo usa para sugerir y para el deslizar. | 14-nov |
| D18 | **Pantallas nuevas**: detalle de posición (Mover / Salida / Corregir / Historial) y Buscar por los últimos dígitos, con parpadeo del cuadrito en el plano y scroll automático a la fila. | 14-nov |
| D19 | **La ronda cabe entera en 360×640 sin deslizar.** El mini-plano va plegado en una tira fina con botón «Ver plano». La sugerencia «Seguir con…» aparece solo al terminar una sección; «Empezar por el final», solo al iniciarla. | 14-nov |
| D20 | **Mini-plano del teléfono ≈ 25 % de la pantalla**, contadores en una sola línea, el plano se encoge al deslizar la lista. Al abrir una sección se ven 5 filas completas (8 al deslizar). | 14-nov |
| D21 | **El plano de PC entra entero en 1366×768**, con ajuste automático de escala, más un **modo pantalla completa** para dejarlo puesto en la oficina. | 14-nov |
| D22 | **El detalle muestra la fecha junto a la hora de ingreso.** | 14-nov |
| D23 | **Una lectura guardada desde la ronda pertenece a la ronda abierta**, no a la hora fija más cercana. Una lectura suelta (una llegada) nunca se guarda en una hora fija que todavía no ha llegado. | 14-nov |
| D24 | **Tipografías del sistema, sin descargas externas.** Nada de Google Fonts: la página abre sin señal desde la primera vez y la carga inicial es mínima. | 14-nov |
| D25 | **ETAPAS DEL CONTENEDOR** (cambio de modelo). Recorrido real: llega **vacío** → se enciende y se **enfría en el sector** → pasa a **Cámara 3 y 4** a **cargar** → vuelve a un sector **con producto** esperando el envío → **despachado**. Reglas configurables: *vacío* no se mide; *enfriando* y *cargando* se miden **sin alerta**; *con producto* se mide **con las alertas de −18/−15**. Contadores, ronda y alertas **solo cuentan las etapas que exigen temperatura**. **Cámara 3 y 4 (6–11) es la única cámara de carga**; Cámara 1 y 2 (1–5) es una zona normal donde llegan vacíos. | 14-nov |
| D26 | **La temperatura de llegada es OPCIONAL**: los contenedores llegan vacíos y sin temperatura. La llegada entra en etapa *vacío*. (Deja sin efecto a D14.) | 14-nov |
| D27 | **Al reportar la salida el contenedor desaparece del patio en vivo de inmediato** —plano, mini-plano, listas, ronda y contadores— y su posición queda libre. **No se borra de nada**: sigue en el historial, en la búsqueda y en los reportes, con su hora de salida. Se mantiene la confirmación y el deshacer. | 14-nov |
| D28 | **Horas en a. m. / p. m. en toda la página**, igual que el formato oficial. (Cambia la decisión anterior de 24 h.) | 14-nov |
| D29 | **El contenedor es el protagonista**: en detalle, ronda y listas el número va grande con **los cuatro dígitos del patio resaltados** (MSCU 12**8160** 8). La posición pasa a dato secundario («Sector C · 1»). | 14-nov |
| D30 | **Gráfico de temperaturas**: línea con un punto por toma y su valor escrito, rayas de referencia en −18 y −15, **separado en Turno día y Turno noche** con las horas en a. m. / p. m. Toma no realizada = punto hueco; código (SE…) = etiqueta. Se llama **«Toma actual»**, no «ranura». | 14-nov |
| D31 | **Plano de PC**: una zona partida en dos columnas muestra su rango en cada título («SECTOR B (1–10)», «SECTOR B (11–20)»). | 14-nov |
| D32 | **El color del cuadrito responde «¿hay que preocuparse?»**: solo *con producto* usa verde/amarillo/rojo. *Vacío* gris, *enfriando* turquesa, *cargando* violeta, *libre* gris claro. Así un cuadrito rojo siempre es una alerta de verdad. | 14-nov |
| D33 | **Las etapas son casi exactamente los códigos del formato oficial**: vacío=**V**, cargando=**C**, con producto=**E**, despachado=**D**. **«Enfriando» no tiene código en la norma** (ver sección «Etapas y el formato oficial»). *SE* no es una etapa: es el motivo de una toma fallida. | 14-nov |
| D34 | **La hoja oficial lleva solo los contenedores que se miden** (enfriando, cargando, con producto). Los vacíos no salen: no tendrían nada que registrar. Si hace falta, su cantidad va en una línea del pie. | 14-nov |
| D35 | **Las lecturas de «enfriando» no se encierran en rojo**: en esa etapa la temperatura es información, no incumplimiento. Salen con su número normal y se anota «en enfriamiento» en Observaciones. | 14-nov |
| D36 | **Ronda sin efecto túnel**: arriba la lista de la sección —la ya medida con su valor, la actual resaltada y las siguientes—; abajo el teclado fijo. Al guardar **solo baja el resaltado** y la lista se mueve lo mínimo (`scrollIntoView` con `block:"nearest"`). Tocar cualquier fila salta a ese contenedor. En PC el teclado no se estira: lista a la izquierda, teclado de 320 px a la derecha, todo en 940 px centrados. | 23-nov |
| D37 | **Llegada de una sola pasada** con **teclado propio en pantalla**: el del teléfono no cambia de letras a números de forma fiable. Un campo de 11 caracteres con el formato visual «MSCU 128160 8» y lo que falta en guiones bajos; tras la cuarta letra el teclado pasa solo a números. Temperatura, producto, sello, estado y nota **plegados en hojas**. | 23-nov |
| D38 | **Modo tutorial lúdico**: 12 pasos con foco sobre la parte que explica, burbuja con emoji, puntos de avance y salida en cualquier momento. Arranca solo la primera vez (marca en `localStorage`) y se repite desde el botón 🧪. Los pasos que necesitan una pantalla abierta (ronda, llegada) la abren ellos mismos con `prepara`. | 23-nov |
| D39 | **Botón 🧪 Modo de prueba** en la cabecera: explica que nada es real, repite el tutorial y **reinicia el modo de prueba** (regenera los datos). Reemplaza al botón que estaba al final de la lista del patio. | 23-nov |
| D40 | **En PC el detalle no es una pantalla, es una ventana.** Pasar el mouse por una fila del plano muestra una **tarjeta con lo importante y sin gráfico** (número, posición, etapa, última temperatura con su hora, producto, sello, tiempo en patio). El clic abre una **ventana pequeña** sobre el plano, que sigue visible detrás. La pantalla completa de detalle se queda solo en el teléfono. Antes el detalle medía 1587 px de alto en una pantalla de 768 y el gráfico 1302 px de ancho. | 23-nov |
| D41 | **El gráfico va plegado** («📈 Temperaturas del día · x de y tomas ▾») en teléfono y en PC, y **nunca pasa de 420 px de ancho**. Además, **las tomas que todavía no tocan dejan de dibujarse como no realizadas**: a las 9 a. m. el turno noche no son seis tomas perdidas, es que aún no es la hora. Eso era lo que hacía que el gráfico se viera sin sentido. | 23-nov |
| D42 | **La demostración trae 5 días operativos**, no 44 horas. Así el selector de día del reporte tiene días de verdad y los gráficos de un día cerrado salen llenos. Un contenedor *enfriando* solo lleva unas horas midiéndose, porque se enciende poco antes de cargar. | 23-nov |
| D43 | **Botón «🌡 Tomar temperatura»** arriba a la derecha de la tarjeta de detalle, en teléfono y en la ventana de PC. Guarda en la ronda en curso. Si el contenedor está vacío dice **«Encender y medir»** y lo pasa a *enfriando* antes de pedir el valor. El teclado **arranca vacío**, no precargado con la lectura anterior. | 23-nov |
| D44 | **La llegada en PC es una ventana con campo de texto normal**: se escribe con el teclado del equipo, en mayúsculas y sin dejar meter letras donde van números. **El teclado en pantalla es solo para el teléfono.** | 23-nov |
| D45 | **El tutorial no arranca solo.** La primera vez aparece una barrita: «👋 ¿Primera vez por aquí? · Ver el recorrido · No, gracias». Después, siempre desde 🧪. | 23-nov |
| D46 | **La fila del patio sin etiquetas con caja**: el número ocupa toda su línea y debajo van posición y etapa como texto normal; «sin tomar» es un punto azul con su palabra. Las cajas EN ESPERA / SIN TOMAR le robaban espacio al número. | 23-nov |
| D47 | **La app dice que cada aparato guarda lo suyo.** En la hoja 🧪 y al tocar el contador: lo que se registra en el teléfono no aparece en la PC hasta la Fase 1. | 23-nov |
| D48 | **Tres roles**: administrador, patero y visualizador. Quién puede qué vive en **una sola tabla**, `src/dominio/permisos.ts`, y las pantallas solo la consultan. **No es seguridad en la Fase 0**: sin servidor, cualquiera podría crearse un administrador en su teléfono. La app lo dice en la pantalla de usuarios. El candado real es la Fase 1 (D8). | 23-nov |
| D49 | **Entrada con PIN, sesión abierta en el aparato.** Un teléfono recién abierto pide **nombre y PIN de 4 números** y queda registrado como **patero**. Después entra solo con el PIN, también sin señal. El **administrador lleva PIN de 6** y **se le pide siempre**, aunque el equipo recuerde la sesión. El PIN se guarda como huella SHA-256 con sal propia, nunca en claro. Cinco intentos y espera. | 23-nov |
| D50 | **El QR lleva solo la dirección.** No carga nombre ni rol: su único fin es que un patero entre por primera vez desde su celular. Se genera en el propio aparato con `uqr` (sin internet) y está en la pantalla de Usuarios, junto con la dirección escrita y las instrucciones de iPhone. | 23-nov |
| D51 | **Últimos movimientos**: hoja que se abre con el botón 🕑 —en la cabecera de la sección en teléfono, en la barra en PC— con *hora · quién · qué* en palabras. Salen del registro `eventos`, al que hubo que **añadirle el número de contenedor y la posición**: antes guardaba solo identificadores internos y no se podía escribir en palabras. | 23-nov |
| D52 | **Arrastrar en el plano de PC: solo el administrador.** Se mantiene presionado y se suelta en una posición libre; el destino se pinta verde si cabe y rojo si está ocupado. Al soltar, aviso con **Deshacer**, sin ventana de confirmación. Patero y visualizador usan el botón **Mover** de siempre. | 23-nov |
| D53 | **Aviso de ronda**: franja arriba cuando ha llegado una hora fija y quedan tomas pendientes («⏰ Ronda de las 4:00 p. m. · faltan 12»), con un toque para entrar y una ✕ para callarla hasta la ronda siguiente. Solo la ve quien puede medir. | 23-nov |
| D54 | **Verificación de turno** (lo que de verdad reemplaza la hoja de patio): una vez por turno, **un botón por sección** — «Todo correcto en Sector C». Solo se tocan las filas que no cuadran. Siete toques si todo está bien, no 115. Queda guardado con día, turno, quién y cuántas correcciones. | 23-nov |
| D55 | **La demostración siembra historia de movimientos** (llegadas, cambios de etapa, movimientos y las tomas de las últimas 14 horas) marcada como **ya enviada**, para que el panel no salga vacío y el contador de pendientes siga siendo honesto. | 23-nov |

## Estado
**Fase 0 construida, probada y subida** (14-nov). 46 pruebas automáticas en verde; sin desbordes ni
errores de consola en 360×640 ni en 1366×768. El código está en
https://github.com/EdisonDavid3/patio-en-vivo (público, rama `main`).

**Publicada en https://edisondavid3.github.io/patio-en-vivo/** (14-nov).
`.github/workflows/publicar.yml` despliega solo en cada push a `main`: instala, corre las 46
pruebas y, solo si pasan, construye con `BASE_PATH=/patio-en-vivo/` y publica.

**Modo avión verificado** sobre los archivos construidos, servidos en `/patio-en-vivo/`:
el service worker se instala; al cortar la red y recargar, la app abre completa (115 posiciones);
se pueden registrar llegadas y lecturas de ronda sin red; el reporte oficial se arma sin red;
y al cerrar y volver a abrir sin red todo sigue ahí. Cero errores de consola.
`navigator.storage.persisted()` devolvió `false` en el navegador de prueba (es lo esperado en uno
automatizado): **queda por comprobar en un iPhone real**.

### Dos cosas que esta sesión NO puede hacer con GitHub
El proxy bloquea estas rutas de la API con HTTP 403, así que las tiene que hacer Edison a mano:
- Crear repositorios (`POST /user/repos`).
- Leer o cambiar los ajustes de Pages (`/repos/{owner}/{repo}/pages`). **Ojo:** si Pages queda en
  «Deploy from a branch», GitHub publica el código fuente tal cual y la página sale en blanco;
  tiene que estar en **GitHub Actions**.
Tampoco se puede abrir `edisondavid3.github.io` desde la sesión (el proxy lo rechaza), ni descargar
el artefacto desplegado (vive en `blob.core.windows.net`, también bloqueado). Para verificar un
despliegue: `gh api repos/EdisonDavid3/patio-en-vivo/deployments/{id}/statuses`.

### El contador de pendientes en la Fase 0
Cuenta los eventos sin enviar. **Sube y no baja, y eso es correcto**: no hay servidor hasta la
Fase 1. Lo que sí debe refrescarse al instante es el patio y el avance de la ronda.

## Etapas y el formato oficial
La leyenda del papel es `C = Cargando · D = Despachado · E = En espera · SE = Sin energía · V = Vacío`.
Cuatro de las cinco etapas **ya son** esos códigos:

| Etapa | Código | ¿Se mide? | ¿Alerta −18/−15? |
|---|---|---|---|
| Vacío | **V** | no | no |
| Enfriando | *(no existe)* | sí | no |
| Cargando | **C** | sí | no |
| Con producto, en espera | **E** | sí | **sí** |
| Despachado | **D** | — | — |

`SE` no es una etapa: es el motivo que se anota **en la celda de una toma** cuando no se pudo medir.
Una prueba (`src/dominio/etapas.test.ts`) vigila esta correspondencia.

**Decidido el 14-nov:**
1. La hoja lleva **solo los contenedores que se miden** (D34). Los vacíos no salen.
2. «Enfriando» se marca **V** en la fila ESTADO: físicamente sigue vacío y la hoja no estrena una
   letra que la jefa no conoce. Si algún día se quiere distinguir, sería **EF** y hay que sumarlo a
   la leyenda del documento, lo cual aprueba la jefa.
3. Las lecturas de *enfriando* **no se encierran en rojo** (D35); se anota «en enfriamiento» en
   Observaciones. Las de *cargando* tampoco.

## Entregables
- `PLAN.md` — plan aprobado.
- `docs/propuesta-pantallas.html` — propuesta visual, publicada en
  https://claude.ai/artifact/7ZUHqj48LxemHT73kWbURo (v2, 14-nov). Siete pantallas: patio en teléfono,
  patio en PC, llegada, ronda, detalle, buscar y reporte diario.
  Se arma con `docs/_p1..._p7.html` + `docs/_datos.json`; el ensamblado concatena las partes y
  sustituye `/*__DATOS__*/` y `__LOGO__`.
- `docs/formatos/` — los dos PDF oficiales y el logo.
- Código de la Fase 0: `src/dominio/` (lógica pura probada), `src/datos/` (la única capa de datos),
  `src/ui/` (pantallas). Pruebas junto al código, en `*.test.ts`.

## Cómo trabajar el código
```
npm install && npm run dev     # desarrollo
npm test                       # 46 pruebas
npm run tipos                  # revisión de tipos
BASE_PATH=/patio-en-vivo/ npm run build
```
La hoja de patio se dibuja desde `src/datos/zonas.ts`: `colsTel` reparte cada zona en columnitas
para el mini-plano del teléfono y `COLS_PC` para el plano de PC. Cambiarlos no toca ninguna pantalla.
Las posiciones **se ordenan por zona y número**, nunca por el orden de IndexedDB (que es alfabético:
C-1, C-10, C-11, C-2...). Hay una prueba que lo vigila.

## Pendiente de Edison
- [x] ~~Nombre del repositorio~~ → `EdisonDavid3/patio-en-vivo`, creado y con el código subido.
- [x] ~~Settings → Pages → Source = GitHub Actions~~ → hecho; la página está publicada.
- [ ] Lista real de opciones de **Producto** y de **Estado**.
- [ ] Nombres reales de los pateros y quién es administrador (ya hay pantalla de Usuarios para crearlos).
- [ ] Un Android y un iPhone reales para probar (Fase 1).
- [ ] Cuenta gratis en supabase.com (Fase 1).

---

## Datos del patio — 115 posiciones (verificadas contra el PDF modelo)

| Zona | Nº | Numeración |
|---|---|---|
| E1 — Cámara 1 y 2 | 5 | 1–5 |
| E2 — Cámara 3 y 4 | 6 | **6–11** (no empieza en 1) |
| Sector C | 22 | 1–22 |
| Sector B | 20 | 1–20 |
| Sector A | 32 | 1–32 |
| Oficina | 6 | 1–6 (en el papel aparece con la letra "A"; en la web **solo "Oficina"**) |
| Patio Nuevo | 24 | 1–24 |

Orden del patio (para reportes y ronda guiada): E1 → E2 → C → B → A → Oficina → Patio Nuevo.

## Identidad visual — colores exactos del archivo del logo
```
rojo  #C1262E     azul  #15488B     gris  #A9AAAB     fondo blanco
```
Alto contraste para el sol; modo oscuro para el turno de noche.
Siempre **color + icono + texto**, nunca solo color.

## Reglas de negocio que no se negocian
- **Día operativo**: 08:00 → 06:00 del día siguiente. **Corte a las 07:00.** Mínimos, máximos,
  promedios y reportes usan el día operativo, no el calendario.
- **Horas fijas de ronda**: 08, 10, 12, 14, 16, 18, 20, 22, 00, 02, 04, 06. Turno día 08→18, noche 20→06.
- **Ventana de asignación** de una lectura a su hora fija: ±50 min (configurable). Fuera de ventana = atrasada.
- **Mover de posición NO reinicia el tiempo en patio** (la estadía continúa; se agrega una ubicación nueva).
- **Mínimo/máximo/promedio ignoran las celdas con código** (SE, V, etc.).
- **Un contenedor no puede estar en dos posiciones.**
- **Conflictos**: gana el más reciente, no se pierde ninguno, el supervisor ve un aviso.
- **La hora de un registro es la del teléfono al momento de la toma**; se guarda también el desfase
  contra el servidor detectado al sincronizar.
- Zona horaria `America/Guayaquil`. Pantalla en 24 h; reporte oficial en a. m. / p. m. Español, °C.
- Botones mínimo 48 px, uso con una mano, **máximo 3 toques para registrar una lectura en la ronda**.
- **Cada patero guarda su orden habitual de secciones** (D17); la app lo usa para sugerir la siguiente
  sección y para decidir cuál es la vecina al deslizar.

## Formato oficial de temperaturas — filas, en orden
`CONTENEDOR · UBICACIÓN · PRODUCTO · SELLO · ESTADO · HORA INGRESO · HORA SALIDA`,
luego las 12 horas fijas (8:00 a. m. … 6:00 a. m.), luego `Mínimo · Máximo · Promedio`.
**10 contenedores por hoja.** Leyenda: `C = Cargando · D = Despachado · E = En espera · SE = Sin energía · V = Vacío`.
Abajo: Observaciones + bloques de turno día / turno noche con nombre y hora de entrega de turno.

---

## Stack — versiones verificadas en npm el 14-nov-2026
| Pieza | Versión |
|---|---|
| React / React DOM | 19.3.1 |
| Vite | 8.3.8 |
| @vitejs/plugin-react | 6.3.0 |
| TypeScript | 7.0.2 (compilador Go; si alguna herramienta falla, bajar a 6.0.3) |
| Dexie | 4.4.7 |
| vite-plugin-pwa | 2.0.0 |
| @supabase/supabase-js | 2.119.0 |
| Vitest | 5.1.0 |
| Node en el contenedor | 22.23.4 |

**Exportación .xlsx**: decidir en Fase 2 entre `exceljs` (más fiel al formato pero sin mantenimiento
desde 2023) y `write-excel-file` 4.1.1 (mantenido).

## Datos de ejemplo de la maqueta
Tienen que cuadrar entre pantallas; se calculan en el navegador desde `_datos.json`, nunca a mano.
52 ocupadas de 115, 7 en alerta, 7 en urgencia, 1 con código SE, 37 de 52 medidas en la ronda de las
10:00. El reporte diario es el **día operativo cerrado del 13-nov**; las demás pantallas son el 14-nov
con la ronda de las 10:00 a medio hacer, y eso se dice en la pantalla.

## Estado del trabajo pedido tras probar la Fase 0
**Todo hecho** (14 y 23-nov): etapas (D25–D27, D32–D34), horas a. m./p. m. (D28), contenedor
protagonista (D29), gráfico de línea (D30), títulos del plano de PC (D31), detalle con los botones
de etapa, ronda sin efecto túnel (D36), llegada de una pasada con teclado propio (D37),
reporte oficial con D34 y D35, tutorial (D38) y modo de prueba (D39).

**Lo único que queda de esa lista:** el **reporte de tiempo en patio** con el desglose por etapa
(el dato ya se guarda en `tramosEtapa` y se ve en el historial del contenedor). Es de la Fase 2.

## Usuarios y roles (D48–D50) — leer antes de tocarlo
- `src/dominio/permisos.ts` es **la única** tabla de permisos. Si se agrega una pantalla o un botón,
  se agrega su acción ahí, no un `if (rol === ...)` suelto.
- `src/datos/usuarios.ts` guarda usuarios, PIN y sesión. El PIN **nunca** se guarda en claro.
- **Esto no es seguridad hasta la Fase 1.** No prometer lo contrario a nadie: sin servidor, los roles
  solo ordenan lo que cada quien ve. Está dicho dentro de la app, en la pantalla de Usuarios.
- Los PIN de la demostración se ven en la hoja 🧪, y desde ahí también se puede
  **simular un teléfono nuevo** (borra todo y muestra la pantalla de primer ingreso).

## Revisión del 23-nov sobre PC (D40–D47)
El problema de fondo era que **en PC se mostraba la pantalla del teléfono estirada**. Ahora el
plano es la pantalla de PC y todo lo demás se abre encima en ventanas. Regla para lo que venga:
**en PC nada ocupa una pantalla entera salvo el plano y el reporte.**

## Regla de arquitectura
Las pantallas **nunca** tocan Supabase ni IndexedDB directamente. Todo pasa por **una sola capa de datos**,
para migrar después al PostgreSQL de la empresa sin tocar pantallas.
La sincronización se basa en una tabla `eventos` que **solo agrega**, con identificador único generado
en el teléfono.

## iPhone — restricción conocida
Safari borra datos de una web tras 7 días sin uso. **Las webs agregadas a la pantalla de inicio están
exentas** (contador propio que se reinicia al abrirlas). La app pide `navigator.storage.persist()`
en cada apertura y **obliga a instalar en pantalla de inicio en iPhone**. En Android es opcional.
Verificar en equipo real en Fase 1.

## Fases
- **Fase 0** — Demo navegable sin servidor, 100 % en el teléfono, funciona en modo avión. Patio, llegada,
  ronda, mover, salida, búsqueda y reporte diario con el formato oficial. Datos ficticios con dígito
  verificador válido.
- **Fase 1** — Supabase, activación de teléfonos, PIN, sincronización y conflictos. Probado en Android e iPhone.
- **Fase 2** — Historial, correcciones, verificación de turno, resto de reportes, .xlsx, Power Query,
  importación de lista esperada.
- **Fase 3** — Alertas, panel del supervisor, documento de migración al servidor de la empresa.

## Pruebas automáticas obligatorias
ISO 6346 · día operativo y corte de las 07:00 · asignación de lecturas a su hora fija (atrasadas y no
realizadas) · mínimo/máximo/promedio ignorando códigos · tiempo en patio con movimientos · sincronización
y conflictos.

## Repositorio
Público. **Ni un dato real ni una clave secreta.** Modo demo con datos ficticios.
