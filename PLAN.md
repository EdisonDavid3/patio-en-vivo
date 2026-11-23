# PLAN — Patio en Vivo (Total Seafood)

> Documento para aprobar antes de escribir código.
> Fecha: 14 de noviembre de 2026. Versión 1 del plan.

---

## 0. Resumen en una página

Vamos a hacer **una página web** que reemplaza los dos papeles del patio: la *hoja de patio*
y el *Control de contenedores y registro de temperaturas*.

- El patero entra por un link desde su celular, pone un PIN de 4 dígitos y ve el mapa del patio.
- **Todo funciona sin señal.** El teléfono guarda primero y manda después, solo cuando pasa por WiFi.
- La jefa entra desde la PC y ve lo último que sincronizó cada patero, con la hora de cada dato.
- El reporte diario sale **idéntico al formato oficial** que ella recibe hoy, listo para imprimir o exportar a Excel.

Se construye en **4 fases**. La Fase 0 es una demo que ya puedes tocar en el celular, en modo avión,
con datos ficticios y sin ningún servidor. Recién en la Fase 1 aparecen las cuentas y la sincronización real.

---

## 1. Decisiones que tomamos hoy

| Tema | Decisión |
|---|---|
| Número de contenedor | **Completo, sin excusas**: 4 letras + 7 dígitos (ISO 6346) obligatorio. No se puede guardar con 4 dígitos. |
| Lectura que no se puede tomar | Se guarda un **código** (C / D / E / SE / V) con el motivo, igual que en el papel. Además el supervisor puede marcar un contenedor entero como *sin energía* o *vacío* y la app deja de pedirle temperatura. |
| Lista de contenedores esperados | **Más adelante** (Fase 2). Dejo el modelo de datos preparado para importar desde Excel, pero en Fases 0 y 1 se escribe a mano con autocompletado. |
| Firmas del reporte | **Solo nombre y hora de entrega de turno**, sin espacio de firma. |
| Encabezado del reporte | **Se eliminan Código, Versión y Página.** Queda logo, título y fecha. |
| Dónde se publica | **GitHub Pages.** Cloudflare Pages queda descartado por ahora (explicación en 3.2). |

**Decisiones del 14-nov, segunda vuelta (tras revisar la propuesta de pantallas):**

| Tema | Decisión |
|---|---|
| Vista principal del patio | **La hoja de patio viva**, con la disposición del PDF modelo. Dos formas: plano completo en PC o tablet, mini-plano + sección abierta en teléfono. Detalle en la sección 7. |
| Etiqueta del rango −18 a −15 | Se llama **«Urgencia»**, no «Aceptable». Ese rango solo se admite en casos de urgencia; lo correcto es −18 o más frío. |
| Registrar llegada | La **temperatura es obligatoria** junto con el número de contenedor. |
| Colores del reporte | Los turnos se distinguen con **dos grises neutros**. El amarillo queda reservado para las lecturas en urgencia. |
| Orden de la ronda | **Sin pantalla de configuración.** Lo decide el patero tocando la sección donde está; la app aprende su orden habitual. Detalle en 7.3. |
| Pantallas nuevas en la propuesta | Detalle de posición, Buscar, y el patio separado en teléfono y PC. |

### 1.1 Un detalle del "sin excusas" que necesito que confirmes

Tu prompt original decía que si el **dígito verificador** no cuadra, se pueda "guardar con advertencia"
para no detener al patero. Tu respuesta de hoy dice "completo sin excusas". Lo voy a implementar así:

- **Los 11 caracteres son obligatorios siempre.** Sin ellos no se guarda. Punto.
- **Si el dígito verificador no cuadra**, la app explica el error y ofrece *"Revisé y está bien, guardar igual"*.
  Queda marcado en rojo para revisión del supervisor.

¿Por qué dejo esa salida? Porque existen contenedores reales con la placa mal impresa o rayada, y
si bloqueo del todo, el patero no puede registrar un contenedor que **sí está parado frente a él**.
La diferencia con "4 dígitos" es grande: ahí sí falta información; aquí está completa y solo es sospechosa.

**Si prefieres bloqueo absoluto también en el dígito verificador, dímelo y lo cambio.**

---

## 2. Lo que encontré en los formatos oficiales

### 2.1 Hoja de patio (modelo base)
Confirmé las **115 posiciones**, exactamente como las describiste:

| Zona | Nº de posiciones | Numeración en la hoja |
|---|---|---|
| E1 — Cámara 1 y 2 | 5 | 1 a 5 |
| E2 — Cámara 3 y 4 | 6 | **6 a 11** (no empieza en 1) |
| Sector C | 22 | 1 a 22 |
| Sector B | 20 | 1 a 20 |
| Sector A | 32 | 1 a 32 |
| Oficina | 6 | 1 a 6 |
| Patio Nuevo | 24 | 1 a 24 |
| **Total** | **115** | |

Ojo con E2: en el papel las posiciones se llaman 6, 7, 8, 9, 10 y 11. La app va a respetar ese nombre,
no los va a renumerar a 1–6.

### 2.2 Formato de temperaturas — tres cosas que tu prompt no mencionaba

1. **Filas HORA INGRESO y HORA SALIDA.** El formato las pide por contenedor. La app las llena sola
   con la hora real de la llegada y de la salida. Un dato menos que escribir a mano.
2. **Encabezado de control documental**: `Código:`, `Versión:`, `Página: __ de __`.
   **Decidido el 14-nov: se eliminan los tres.** El encabezado del reporte queda con el logo,
   el título y la fecha, nada más. Las hojas salen impresas en orden; si algún día la jefa pide
   el "Página 1 de 3", se vuelve a poner en cinco minutos.
3. **La leyenda de códigos** (C = Cargando, D = Despachado, E = En espera, SE = Sin energía, V = Vacío)
   con la instrucción *"usar el código en la celda cuando no se pueda tomar la lectura"*.
   Esto es lo que cambia el modelo de datos: **una celda de lectura puede contener un número o una letra**,
   nunca las dos cosas.

### 2.3 Dos diferencias que voy a resolver así

- **Tamaño de papel.** El formato oficial está en tamaño **carta horizontal**, no A4.
  Tu prompt pide impresión A4. Voy a hacer que el reporte se imprima bien en **las dos medidas**
  (el diseño se adapta), con A4 por defecto.
- **Rango de temperatura.** El papel dice solo *"-18 °C o más frío"*. Tu prompt tiene tres colores
  (verde / amarillo entre -18 y -15 / rojo sobre -15). En pantalla uso los tres colores;
  **en el papel impreso mantengo el criterio del formato oficial** (fuera de rango = más caliente que -18)
  para que la jefa no vea algo distinto a lo que firma hoy. Todo configurable.

### 2.4 Colores exactos del logo
Los saqué del archivo, no de la web:

| Color | Valor exacto | Lo que decía tu prompt |
|---|---|---|
| Rojo | `#C1262E` | ≈ #C02028 |
| Azul | `#15488B` | ≈ #104888 |
| Gris | `#A9AAAB` | ≈ #A8A8A8 |

---

## 3. Arquitectura

Mantengo la que propusiste. La revisé y es la correcta para este caso; abajo explico los dos puntos
donde propongo algo distinto y por qué.

```
  TELÉFONO DEL PATERO (sin señal)          SERVIDOR (solo cuando hay WiFi)
  ┌──────────────────────────────┐         ┌───────────────────────────┐
  │  Pantallas (React)           │         │  Supabase                 │
  │        ↕                     │         │  - PostgreSQL             │
  │  UNA SOLA CAPA DE DATOS      │ ──────► │  - Auth                   │
  │        ↕                     │  cola   │  - Seguridad por filas    │
  │  IndexedDB (Dexie)           │ ◄────── │  - Función de exportación │
  │  + cola de envíos pendientes │         └───────────────────────────┘
  └──────────────────────────────┘
         ↑ Service Worker: la página abre sin señal
```

### 3.1 Versiones — verificadas hoy en el registro de npm, no de memoria

| Pieza | Versión | Publicada |
|---|---|---|
| React / React DOM | 19.3.1 | 14-oct-2026 |
| Vite | 8.3.8 | 11-nov-2026 |
| @vitejs/plugin-react | 6.3.0 | 9-nov-2026 |
| TypeScript | 7.0.2 | 8-jul-2026 |
| Dexie (IndexedDB) | 4.4.7 | 19-oct-2026 |
| vite-plugin-pwa | 2.0.0 | 3-oct-2026 |
| @supabase/supabase-js | 2.119.0 | 4-nov-2026 |
| Vitest (pruebas) | 5.1.0 | 2-nov-2026 |
| Node (en esta máquina) | 22.23.4 | cumple el mínimo de todas |

Dos avisos técnicos que ya revisé:

- **TypeScript 7** es el compilador nuevo escrito en Go (8 a 12 veces más rápido) y es estable desde julio.
  Quitó una API interna vieja que algunas herramientas usaban. En nuestro caso TypeScript solo revisa tipos
  (Vite compila con otra cosa), así que no nos afecta. Si alguna herramienta se queja, se baja a TypeScript 6.0.3
  sin tocar una línea de nuestro código.
- **Para exportar a Excel** la librería más fiel al formato (`exceljs`) no recibe actualizaciones desde 2023.
  Funciona bien y es solo escritura de archivos, pero lo anoto como riesgo. La alternativa mantenida es
  `write-excel-file` 4.1.1. Decido en la Fase 2, cuando toque la exportación, probando cuál respeta mejor
  las celdas combinadas y los colores del formato.

### 3.2 Dos cambios que propongo sobre tu arquitectura

**a) El acceso del patero no usa "PIN contra el servidor".**
Un PIN de 4 dígitos sobre un link público se rompe en minutos. Propongo el esquema que insinuabas,
desarrollado (detalle completo en la sección 6):

1. El supervisor genera un **código de activación** de un solo uso para ese teléfono.
2. El teléfono lo canjea **una vez, con WiFi**, y recibe una credencial larga que queda guardada en el equipo.
3. De ahí en adelante **el PIN solo abre el teléfono**, nunca viaja al servidor.
   Sin el teléfono activado, el PIN no sirve para nada; sin el PIN, el teléfono no abre.

**b) Para publicar: GitHub Pages. DECIDIDO, sin cambio.**
Cloudflare Pages queda descartado. El motivo por el que lo había mencionado era comodidad a futuro,
no una necesidad técnica, y no justifica meter otra cuenta más en el proyecto. Queda anotado aquí por
si algún día aparece alguna de estas tres situaciones, que son las únicas en que valdría la pena mover:

1. **Quieres un dominio propio con candado**, tipo `patio.totalseafood.com.ec`. GitHub Pages lo permite,
   pero hay que tocar el DNS del dominio de la empresa a mano.
2. **La hoja de patio empieza a cargar lento desde el celular.** GitHub Pages sirve el sitio desde
   Estados Unidos; otros servicios lo copian a Ecuador. Con lo liviana que va a ser la página,
   esto es poco probable.
3. **El repositorio tiene que dejar de ser público.** GitHub Pages gratis solo publica repositorios
   públicos. Como el nuestro no va a tener ni un dato real ni una clave, esto tampoco debería pasar.

Mientras ninguna de las tres ocurra, **GitHub Pages es la opción correcta** y además es una cuenta menos
que administrar. Si alguna vez hay que mover el sitio, es cambiar dónde se publica: **el código no se toca**.

---

## 4. Modelo de datos

Pensado para crecer, como pediste. Las tablas son las mismas en el teléfono y en el servidor.

| Tabla | Para qué sirve |
|---|---|
| `zonas` | E1, E2, Sector A/B/C, Oficina, Patio Nuevo. Nombre, orden, activa. El supervisor las edita. |
| `posiciones` | Las 115. Pertenecen a una zona, tienen su número tal como está en el papel, orden y activa. |
| `contenedores` | El número ISO 6346 y un campo libre `datos_extra` para lo que venga después (proforma, destino, naviera, cliente) **sin rehacer nada**. |
| `estadias` | Cada paso de un contenedor por el patio: entrada, salida, producto, sello, estado. Es lo que da el "tiempo en patio". |
| `ubicaciones` | En qué posición estuvo cada estadía y desde cuándo. **Mover crea una fila nueva; la estadía no se corta**, por eso el tiempo en patio no se reinicia. |
| `lecturas` | Una por contenedor y por hora fija. Guarda **o** un número en °C **o** un código (C/D/E/SE/V), nunca ambos. Más: hora real de la toma, hora fija a la que se asignó, quién, si fue atrasada. |
| `usuarios` | Pateros y supervisores. Nombre, rol, PIN cifrado, activo y **el orden de secciones que suele seguir en la ronda** (ver 7.3). |
| `dispositivos` | Cada teléfono activado: a qué usuario pertenece, cuándo se activó, si fue revocado. |
| `config` | Horas de ronda, rangos de temperatura, turnos, listas de Producto y Estado, datos del encabezado del reporte. **Todo lo configurable vive aquí, no en el código.** |
| `eventos` | **El corazón de la sincronización.** Registro que solo crece: quién hizo qué y cuándo. Cada evento nace en el teléfono con un identificador único propio, así nunca se duplica al sincronizar. También es la auditoría: qué decía antes y quién lo corrigió. |

**Regla de oro:** las pantallas nunca hablan con Supabase ni con IndexedDB directamente. Hablan con
**una sola capa de datos**. El día que la empresa ponga su propio PostgreSQL, se cambia esa capa
y ninguna pantalla se entera.

---

## 5. Sin conexión: cómo funciona de verdad

1. **Abrir sin señal.** Un *service worker* guarda la página entera en el teléfono. Abre en modo avión.
2. **Guardar primero en el teléfono.** Al tocar "Guardar", el dato ya está en IndexedDB y la pantalla
   responde al instante. El envío al servidor es aparte.
3. **Cola de pendientes, siempre a la vista.** Arriba de la pantalla, fijo: *"3 pendientes · última sincronización 10:42"*.
   Y un botón **"Sincronizar ahora"**.
4. **Sincroniza sola** al detectar red, en segundo plano.
5. **La hora es la del teléfono** en el momento de la toma. Como el reloj de un celular puede estar mal,
   al sincronizar la app compara con la hora del servidor y guarda la diferencia. Si un teléfono está
   desfasado más de unos minutos, **el supervisor ve un aviso**.
6. **Antes de salir al patio**: pantalla de "Preparar ronda" que descarga el estado actual.
   Si los datos locales tienen más de X horas (configurable, propongo 8), avisa en grande.
7. **Conflictos**: gana el registro más reciente, **no se borra ninguno**, y al supervisor le aparece
   un aviso con las dos versiones para que decida.
8. **Día operativo**: de las 08:00 a las 06:00 del día siguiente. El corte está a las **07:00**:
   todo lo registrado antes de las 07:00 pertenece al día operativo anterior. Mínimos, máximos,
   promedios y reportes usan ese día, no el calendario.
9. **Cada lectura se asigna a su hora fija** con una ventana configurable (propongo ±50 minutos).
   Fuera de la ventana se marca **atrasada**. Si llega la hora siguiente y no hay lectura, se marca
   **no realizada**.

### 5.1 iPhone: lo que los pateros deben hacer sí o sí

Investigué la política actual de almacenamiento de WebKit. El resumen honesto:

- Safari **borra** los datos guardados por una web después de **7 días sin usarla**.
- **Las webs agregadas a la pantalla de inicio están exentas** de esa regla: tienen su propio contador
  que se reinicia cada vez que se abren. Está documentado por Apple.
- Además la app va a pedir `navigator.storage.persist()` **cada vez que abre**, que es la forma de
  protegerse del borrado por falta de espacio. En iPhone se concede por criterio del sistema, y
  justamente favorece a las apps agregadas a la pantalla de inicio.

**Entonces, para iPhone, agregar a la pantalla de inicio NO es opcional, es obligatorio.**
En Android con Chrome sí es opcional. Voy a hacer que la app detecte un iPhone que no está en la
pantalla de inicio y muestre las instrucciones con dibujos hasta que lo haga.

Regla práctica que le daremos a los pateros, en cualquier teléfono:
**no termines el turno con pendientes sin enviar.** La app va a avisar al cerrar sesión si quedan.

Todo esto hay que **probarlo en un iPhone real** (está en la Fase 1), no me quedo con lo documentado.

### 5.2 Si algún día hay WiFi en el patio
No hay que rehacer nada. La capa de datos ya está preparada para que Supabase empuje los cambios en
tiempo real; es activar esa suscripción y la oficina pasa de "lo último sincronizado" a "ahora mismo".

---

## 6. Ingreso y seguridad

**Patero (teléfono):**
1. El supervisor crea al patero y genera un **código de activación de un solo uso** (6 caracteres, vence en 24 h).
2. El patero abre el link **una vez con WiFi**, pone el código y elige su PIN de 4 dígitos.
3. El teléfono guarda una credencial larga y aleatoria. **El PIN nunca sale del teléfono**: solo
   descifra esa credencial localmente.
4. De ahí en adelante entra con PIN, **con o sin señal**.
5. **Máximo 5 intentos**; luego espera creciente (1, 2, 4, 8 minutos). A los 10 intentos fallidos
   el teléfono se bloquea y necesita un código nuevo del supervisor.
6. El supervisor puede **revocar** un teléfono perdido desde su panel.

**Supervisor / jefa:** correo y contraseña (Supabase Auth), siempre con conexión.
Opción de segundo factor más adelante.

**Todo registro guarda quién, cuándo y desde qué teléfono.**
El repositorio es público: **no habrá ni un dato real ni una clave secreta dentro del código**.

---

## 7. Pantallas

Propuesta visual publicada y aprobada en lo esencial: https://claude.ai/artifact/7ZUHqj48LxemHT73kWbURo

### 7.1 El patio es la hoja viva

La vista principal **no es una lista de zonas: es la hoja de patio**, con la disposición del PDF modelo
(E1 y E2 a la izquierda, luego Sector C, Sector B con Oficina debajo, Sector A y Patio Nuevo).
Cambia la forma según el aparato:

**En PC o tablet — el supervisor y la pantalla de la oficina**
- El plano completo con las siete tablas en su lugar, igual que la hoja.
- Cada fila: contenedor, última temperatura con su color y la hora de esa toma.
- Pensada para **dejarla abierta en una pantalla de la oficina y que se actualice sola**, con la hora
  de la última actualización siempre visible.
- Las filas fuera de rango se tiñen, para que salten a la vista desde lejos.

**En teléfono — el patero**
- **Mini-plano fijo arriba** con la disposición de la hoja. Cada posición es **un cuadrito de color sin
  texto** (correcto, urgencia, alerta, sin lectura, libre). Caben las 115.
  Las zonas largas se reparten en varias columnitas para que quepan sin comerse la pantalla; el orden
  dentro de cada zona sigue siendo de arriba hacia abajo.
- **Al tocar una sección** se abre debajo con sus contenedores, y esa sección queda resaltada en el
  mini-plano como **«estás aquí»**.
- **Deslizar hacia los lados** pasa a la sección vecina.
- **Al buscar un contenedor**, su cuadrito parpadea en el mini-plano y la lista baja sola hasta su fila.
- **El zoom con los dedos sobre la hoja completa** queda solo como vista de consulta, con el teléfono
  en horizontal. Para trabajar se usa el mini-plano, que no se mueve.

**En los dos:** filtros **«Solo alertas»** y **«Sin tomar en esta ronda»**.

### 7.2 Las demás pantallas

| # | Pantalla | Qué hace |
|---|---|---|
| 1 | **Patio** | Lo de 7.1. |
| 2 | **Llegada** | Tocar posición libre → **número de contenedor y temperatura, los dos obligatorios**. Producto, sello y estado son opcionales y editables después. |
| 3 | **Ronda guiada** | Pide **solo la temperatura**. Avance "37/52", **lectura anterior a la vista**, botón para **volver a la posición anterior**, y el mini-plano marcando lo medido y lo pendiente. **Máximo 3 toques por lectura.** |
| 4 | **Detalle de posición** | Se abre al tocar una posición ocupada. Temperaturas del día, datos del formato, tiempo en patio y las cuatro acciones: **Mover, Salida, Corregir, Historial**. |
| 5 | **Buscar** | Por los **últimos dígitos**, como los nombran en el patio. Parpadea el cuadrito en el plano y la lista baja sola. También busca en el historial. |
| 6 | **Reporte diario** | El formato oficial en pantalla, con colores y faltantes marcados. Imprimir y exportar. |
| 7 | Verificación de turno | Una vez por turno, confirmar posición por posición. Reemplaza la hoja de patio. |
| 8 | Historial del contenedor | Entrada, salida, tiempo total, posiciones, temperaturas con gráfico y correcciones. |
| 9 | Alertas | Fuera de rango y tomas atrasadas. |
| 10 | Configuración (supervisor) | Zonas, posiciones, horas, rangos, listas de Producto y Estado, pateros, teléfonos. |

### 7.3 El orden de la ronda, sin pantalla de configuración

Nadie configura rutas. Funciona así:

1. El patero **empieza tocando en el mini-plano la sección donde está parado**.
2. **Dentro de la sección va en orden ascendente.** Si entró por el otro lado, el botón
   **«Empezar por el final»** la recorre al revés.
3. Al terminar una sección, la página **sugiere la siguiente pendiente con un botón grande**,
   pero el patero puede tocar cualquier otra.
4. **La página recuerda el último orden de cada patero** y lo usa para sugerir y para decidir
   cuál es la sección vecina al deslizar.

Eso exige guardar una preferencia por usuario (el orden de secciones que suele seguir). Va en el
modelo de datos, en `usuarios`.

### 7.4 Reglas que valen en todas

**Teclado de temperatura:** numérico, **con el signo negativo puesto por defecto**. El patero escribe
"18" y se guarda −18. Acepta decimales y permite cambiar el signo. Pide confirmación si el valor es
improbable (+18, −80). Es el mismo teclado en la llegada y en la ronda.

**Etiquetas de los rangos:** Correcto (−18 o más frío) · **Urgencia** (−18 a −15) · Alerta (más
caliente que −15). «Urgencia» porque ese rango solo se admite en casos de urgencia, no es normal.

**Siempre color + icono + texto**, nunca solo color.

---

## 8. Reportes

| Reporte | Contenido |
|---|---|
| **Control de contenedores y registro de temperaturas** | Reproduce el formato oficial: encabezado con logo, `TOTAL SEAFOOD — CÁMARA DE ALMACENAMIENTO DE CONGELADO`, fecha y responsables de turno (**sin Código, Versión ni Página**); **10 contenedores por hoja**, tantas hojas como hagan falta; filas Contenedor, Ubicación, Producto, Sello, Estado, **Hora ingreso, Hora salida**; las 12 horas fijas en el orden del papel (8:00 a. m. … 6:00 a. m.); Mínimo, Máximo y Promedio calculados solos; leyenda de códigos; Observaciones del día; y los bloques de turno día / turno noche con **nombre y hora de entrega de turno**. |
| **Tiempo en patio** | Contenedor, entrada, salida, tiempo total, posiciones por las que pasó, temperatura mínima y máxima, lecturas fuera de rango. |
| **Hoja de patio** | El mismo diseño del PDF modelo, ya llena, imprimible. |

En pantalla, los **turnos se distinguen con dos grises neutros**, no con amarillo: el amarillo queda
reservado para las lecturas en urgencia, que es lo que de verdad hay que mirar.

Todos: **vista en línea, impresión (A4 y carta) y exportación a .xlsx**.
Además una **vista de datos plana** con un enlace que Excel puede conectar con Power Query y actualizar solo.

El mínimo, máximo y promedio **se calculan solo con lecturas numéricas**; las celdas con código (SE, V…)
no entran en el cálculo, igual que cuando se hace a mano.

---

## 9. Pruebas automáticas

Para lo crítico, como pediste:

- Validación **ISO 6346** (dígito verificador), con casos reales y casos con error.
- **Día operativo**: que una lectura de las 02:00 caiga en el día anterior, y el corte de las 07:00.
- **Asignación de lecturas** a su hora fija y marcado de atrasadas y no realizadas.
- **Mínimo, máximo y promedio**, ignorando los códigos.
- **Tiempo en patio** con movimientos de posición en el medio.
- **Sincronización y conflictos**: dos teléfonos tocando la misma posición sin conexión.

---

## 10. Fases

### Fase 0 — Demo navegable (sin servidor)
Todo en el teléfono, funciona en modo avión, datos ficticios con contenedores de dígito verificador válido.
Incluye: patio, llegada, ronda, mover, salida, búsqueda y el reporte diario con el formato oficial.
**Qué probarás:** abrirla en tu celular, ponerla en modo avión, registrar una llegada, hacer una ronda
completa, mover un contenedor, darle salida e imprimir el reporte.

### Fase 1 — Servidor y sincronización real
Supabase, activación de teléfonos, PIN, sincronización al recuperar WiFi, conflictos.
Probado en **Android y iPhone reales**.
**Qué probarás:** dos teléfonos a la vez, uno en modo avión; ver los pendientes bajar al volver el WiFi;
que la jefa vea los datos desde la PC con la hora de cada patero.

### Fase 2 — Historial, correcciones y Excel
Historial por contenedor, correcciones con auditoría, verificación de turno, resto de reportes,
exportación .xlsx, conexión con Excel (Power Query) e **importación de la lista de contenedores esperados**.

### Fase 3 — Alertas y panel del supervisor
Alertas dentro de la página (estructura lista para correo o WhatsApp después),
panel del supervisor y el documento de migración al servidor de la empresa.

Al cerrar cada fase te digo exactamente **qué probar y cómo**, paso a paso.

---

## 11. Lo que necesito de ti

| Cuándo | Qué | Por qué |
|---|---|---|
| ~~Ahora~~ **HECHO 14-nov** | ~~Conectar GitHub~~ Conectado: la sesión entra como `EdisonDavid3`. Falta solo que me digas **el nombre del repositorio**. | Esta sesión trabaja en una máquina temporal. Sin GitHub, lo que construya se pierde al cerrar. |
| Fin de Fase 0 | Un celular Android y un iPhone para probar. | Son los dos que usan los pateros. |
| Antes de Fase 1 | Crear cuenta gratis en supabase.com (te guío con capturas). | Es el servidor. |
| Cuando puedas | La lista de opciones reales de **Producto** y de **Estado**. | Para cargarlas como listas configurables. |
| Cuando puedas | Nombres de los pateros y quién es supervisor. | Para crear los usuarios. |

---

## 12. Riesgos y supuestos

| Riesgo | Cómo lo manejo |
|---|---|
| iPhone borra datos guardados | Instalación en pantalla de inicio obligatoria + `persist()` + aviso de pendientes. **Se prueba en equipo real en Fase 1.** |
| Reloj del teléfono mal puesto | Se guarda la hora del teléfono y la diferencia con el servidor; aviso al supervisor si se desvía. |
| El patero teclea 11 caracteres bajo el sol | Autocompletado, sugerencia de prefijos, botones grandes. Si aun así es lento, la importación de lista (Fase 2) lo resuelve del todo. |
| `exceljs` sin mantenimiento desde 2023 | Se evalúa contra `write-excel-file` en Fase 2. |
| Dos pateros en la misma posición sin señal | Gana el más reciente, se conservan ambos, el supervisor decide. |

**Supuestos que asumo salvo que me digas lo contrario:**
- Un contenedor que entró **y salió** el mismo día operativo **sí aparece** en el reporte de ese día,
  con sus lecturas y su hora de salida.
- Las columnas del reporte diario se ordenan **siguiendo el orden del patio** (E1, E2, C, B, A, Oficina, Patio Nuevo).
- Zona horaria `America/Guayaquil`, pantalla en 24 horas, reporte oficial en a. m. / p. m.

---

## 11.bis Etapas del contenedor (revisión del 14-nov)

El patio no es «contenedor puesto, contenedor medido». Tiene un recorrido:

```
  llega VACÍO ─► se enciende y ENFRÍA en el sector ─► CÁMARA 3 Y 4: CARGA
       │                                                     │
       ▼                                                     ▼
  no se mide            se mide, sin alerta          se mide, sin alerta
                                                             │
                                   CON PRODUCTO, esperando envío ◄┘
                                   se mide cada 2 h, CON alertas
                                             │
                                             ▼
                                        DESPACHADO
```

**Cámara 3 y 4 (posiciones 6 a 11) es la única cámara de carga.** Cámara 1 y 2 (1 a 5) es una zona
normal: se usa poco y los contenedores que llegan ahí están vacíos.

| Etapa | ¿Se mide? | ¿Alerta −18/−15? | ¿Entra en la ronda? | Código oficial |
|---|---|---|---|---|
| Vacío | no | no | no | **V** |
| Enfriando | sí | no | sí | *(no existe)* |
| Cargando | sí | no | sí | **C** |
| Con producto, en espera | sí | **sí** | sí | **E** |
| Despachado | — | — | — | **D** |

Todo es configurable por el supervisor: vive en `config`, no en el código.

**Consecuencia importante:** los contadores, la ronda y las alertas **solo cuentan los contenedores
cuya etapa exige temperatura**. Un patio con 52 ocupadas puede tener solo 35 en la ronda.
Y en el plano **solo un contenedor con producto puede salir en rojo**: en las demás etapas la
temperatura es información, no alarma. Vacío va en gris, enfriando en turquesa, cargando en violeta.

### Lo que hace el patero, en botones grandes
| Etapa | Botón |
|---|---|
| Vacío | **Empezar a enfriar** — un toque. |
| Enfriando | **Pasar a cámara 3 y 4** — muestra las 6 posiciones, las ocupadas apagadas; si solo hay una libre, mueve directo. Se resalta cuando el contenedor ya está **listo para cargar**. |
| Cargando | **Sacar de la cámara** — pregunta *«¿Ya tiene producto?»*. Si sí, empieza la vigilancia con alertas y ofrece **volver a su posición anterior** de un toque si sigue libre. |
| Con producto | **Reportar la salida**. |
| Siempre | Mover · Corregir · Historial · Salida. |

Mientras enfría, la app muestra **cuánto le falta** para la temperatura ideal y avisa
**«Listo para cargar»** al alcanzarla.

### Las etapas y el formato oficial
Cuatro de las cinco **ya son** los códigos del papel (V, C, E, D). **«Enfriando» es la única que la
norma no contempla.** Decidido el 14-nov:
1. **La hoja lleva solo los contenedores que se miden**: enfriando, cargando y con producto. Los
   vacíos no salen, porque no tendrían nada que registrar y solo ocuparían columnas en blanco.
2. **«Enfriando» se marca V** en la fila ESTADO: físicamente sigue vacío, y así la hoja no estrena
   una letra que la jefa no conoce. Si algún día se quiere distinguir sería **EF**, y eso significa
   cambiar la leyenda de un documento controlado: lo aprueba la jefa.
3. **Las lecturas de enfriando no se encierran en rojo**, ni las de cargando: en esas etapas la
   temperatura es información, no incumplimiento. Se anota «en enfriamiento» en Observaciones.

### Salida
Al reportarla, el contenedor **desaparece del patio en vivo de inmediato** y su posición queda libre.
No se borra de nada: sigue en el historial, en la búsqueda y en los reportes, con su hora de salida.
Se mantiene la confirmación y el deshacer.

### Tiempos por etapa
Se guarda cuánto estuvo en cada una (`tramosEtapa`), para el historial y el reporte de tiempo en patio.

## 12.bis Estado de la Fase 0 (14-nov)

**Construida y probada.** Lo que quedó hecho:

| | |
|---|---|
| Dominio probado | ISO 6346, día operativo con corte a las 07:00, asignación de lecturas a su hora fija, rangos, mínimo/máximo/promedio, tiempo en patio con movimientos. **46 pruebas en verde.** |
| Capa de datos | Una sola (`src/datos/repo.ts`), sobre IndexedDB con Dexie. Las pantallas no la saltan nunca. |
| Pantallas | Patio (teléfono y PC), Llegada, Ronda, Detalle, Buscar y Reporte diario. |
| Sin conexión | Service worker con todo en caché, `navigator.storage.persist()` en cada apertura, tipografías del sistema (ninguna descarga externa). |
| Probado | 360×640 y 1366×768: sin desbordes, sin errores de consola, la ronda entera sin deslizar, 5 filas visibles al abrir una sección, el plano de PC completo en pantalla. |

**Correcciones de la segunda revisión, ya aplicadas:** la ronda cabe en una pantalla pequeña;
el mini-plano baja a un cuarto de la pantalla y se encoge al deslizar; el plano de PC se ajusta
solo y tiene modo pantalla completa; el detalle muestra la fecha de ingreso.

**Dos fallos que encontré yo al probar y corregí:**
1. Una lectura tomada a las 03:23 se guardaba en la hora fija de las 04:00 (la más cercana) en
   vez de la ronda de las 02:00 que el patero tiene abierta. Ahora manda la ronda abierta, y una
   lectura suelta nunca cae en una hora que no ha llegado.
2. Las posiciones salían ordenadas como texto (C 1, C 10, C 11, C 2…) porque así las devuelve
   IndexedDB. Ahora van por zona y número, con una prueba que lo vigila.

**Subida a GitHub:** el código está en https://github.com/EdisonDavid3/patio-en-vivo.
Falta un solo ajuste, que esta sesión no puede hacer porque la API de Pages está bloqueada:
en *Settings → Pages*, poner el origen en **GitHub Actions** en vez de «Deploy from a branch».
Con «branch» GitHub publica el código fuente tal cual y la página sale en blanco.

## 12.ter Revisión del 23-nov

**Ronda sin efecto túnel.** Ya no cambia toda la pantalla en cada lectura. Arriba va la lista de la
sección: la que ya mediste con su valor, la tuya resaltada y las que siguen. Abajo, el teclado fijo.
Al guardar **solo baja el resaltado** y la lista se mueve lo mínimo. Tocar cualquier fila salta a ese
contenedor. Cabe en 360×640 con 4 filas a la vista. En PC el teclado no se estira: lista a la
izquierda, teclado de 320 px a la derecha.

**Llegada de una sola pasada.** Un campo de 11 caracteres con el formato a la vista
(«MSCU 128160 8», lo que falta en guiones bajos) y **teclado propio en pantalla**: letras hasta la
cuarta y después números, sin depender del teclado del teléfono, que no cambia de forma fiable.
La temperatura es opcional y está plegada, igual que producto, sello, estado y nota.

**Reporte oficial** con las dos decisiones: solo salen los contenedores que se miden —los vacíos se
cuentan al pie—, el ESTADO lleva la letra del formato (V, C, E, D) y las lecturas de enfriando y
cargando no se encierran en rojo, con su nota en Observaciones.

**Modo tutorial lúdico.** Doce pasos que alumbran la parte que explican, con burbuja, emoji y puntos
de avance. Arranca solo la primera vez y se repite cuando se quiera. Los pasos de ronda y llegada
abren esas pantallas por su cuenta para que se vean trabajando.

**Modo de prueba.** Botón 🧪 en la cabecera: dice que nada es real, repite el tutorial y **reinicia
la demostración** generando un patio nuevo. Es lo que hay que tocar cuando salga una versión nueva.

## 12.quater Revisión del 23-nov: la PC

El problema de fondo: **en PC se mostraba la pantalla del teléfono estirada**. El detalle medía
1587 px de alto en una pantalla de 768 y el gráfico 1302 px de ancho — seis puntos repartidos en
metro y medio no dicen nada.

**Lo que cambia:**

| | |
|---|---|
| Pasar el mouse | Tarjeta flotante con lo importante y **sin gráfico**: número, posición, etapa, última temperatura con su hora, producto, sello y tiempo en patio. |
| Hacer clic | **Ventana pequeña** sobre el plano, que sigue visible detrás. La pantalla completa de detalle queda solo en el teléfono. |
| El gráfico | **Plegado** por defecto y nunca más ancho de 420 px. |
| Registrar llegada | **Ventana** con campo de texto normal: en PC se escribe con el teclado del equipo. El teclado en pantalla es solo del teléfono. |

**Un error que explicaba lo de «el gráfico se ve sin sentido»:** a las 9 de la mañana estaba
dibujando las seis tomas del turno noche como *no realizadas*, cuando todavía no toca medirlas.
Ahora las tomas futuras no se dibujan como perdidas.

**Lo que faltaba:** no había forma de tomar temperatura fuera de la ronda. Se agregó el botón
**«🌡 Tomar temperatura»** arriba a la derecha de la tarjeta de detalle. En un contenedor vacío dice
«Encender y medir» y lo pasa a *enfriando* antes de pedir el valor.

**Modo de prueba:** pasa de 44 horas a **5 días operativos**, para que el selector de día del reporte
tenga días de verdad y un día cerrado muestre sus 12 tomas.

**El tutorial ya no arranca solo:** se ofrece una vez con una barrita y se repite desde 🧪.

**Cada aparato guarda lo suyo.** Hasta la Fase 1 no hay servidor: lo que se registra en el teléfono
no aparece en la PC. Ahora la app lo dice.

## 12.quinquies Usuarios, roles y lo demás del 23-nov

**Tres roles**, con los permisos en una sola tabla:

| Rol | Qué puede | PIN |
|---|---|---|
| **Administrador** | Todo: usuarios, ajustes, arrastrar en el plano, y lo del patero. | 6 números, **se pide siempre** |
| **Patero** | Llegadas, temperaturas, ronda, mover, salida, verificación de turno. | 4 números |
| **Visualizador** | Solo mira: plano, listas, fichas y reportes. | 4 números |

**Importante y dicho dentro de la app:** en la Fase 0 esto **no es un candado**. Sin servidor,
cualquiera podría crearse un administrador en su propio teléfono. Los roles sirven para que cada
quien vea lo suyo y no se equivoque de botón. La seguridad real es la Fase 1.

**Primer ingreso desde el celular.** El QR lleva solo la dirección. Al abrirlo en un teléfono sin
usuario, lo primero que se pide es **nombre y un PIN de 4 números**, y queda registrado como patero.
Después entra solo con el PIN, también sin señal.

**Últimos movimientos.** Botón 🕑 en el patio: *hora · quién · qué*, en palabras. Para esto hubo que
guardar el número de contenedor y la posición en el registro de eventos; antes solo tenía
identificadores internos.

**Arrastrar en el plano de PC: solo el administrador.** Se mantiene presionado y se suelta en una
posición libre; verde si cabe, rojo si está ocupada, y aviso con Deshacer al soltar.

**Aviso de ronda.** Cuando llega la hora fija y quedan tomas, una franja arriba con el conteo.

**Verificación de turno.** Lo que de verdad reemplaza la hoja de patio: un botón por sección,
«Todo correcto en Sector C». Siete toques si todo cuadra.

## 13. Qué pasa cuando apruebes

1. Creo `CLAUDE.md` con estas decisiones, para no perder el hilo entre sesiones.
2. Te muestro **la propuesta visual de las 4 pantallas principales**.
3. Con tu visto bueno, construyo la **Fase 0** y te digo qué probar.

**Dime "aprobado" o qué quieres cambiar.**
