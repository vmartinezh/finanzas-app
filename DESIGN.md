---
name: Simplifika
description: Tus cuentas, más simples. Un número que guía el día, en verde salvia.
colors:
  salvia: "#a8b9a0"
  salvia-suave: "#dfe7da"
  salvia-texto: "#1f281c"
  salvia-texto-2: "#33402e"
  musgo: "#46583f"
  noche-de-huerto: "#232d20"
  fondo: "#f0f3ee"
  superficie: "#ffffff"
  superficie-2: "#eaefe6"
  borde: "#dde4d8"
  texto: "#1f281c"
  texto-2: "#4e5b49"
  texto-3: "#6e7a69"
  bien: "#2f7a2f"
  alerta: "#9a6b00"
  alerta-barra: "#e9b23a"
  critico: "#b83232"
  critico-barra: "#d03b3b"
  serie-1: "#5e7556"
  serie-2: "#4e7bb0"
  moneda: "#e9b23a"
  moneda-anillo: "#b07e14"
typography:
  display:
    fontFamily: "Plus Jakarta Sans, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2.8rem, 14vw, 3.6rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.04em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "clamp(2.4rem, 11vw, 3.2rem)"
    fontWeight: 750
    lineHeight: 1.1
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  title:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  section:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.85rem"
    fontWeight: 600
    lineHeight: 1.3
  overline:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 600
    letterSpacing: "0.04em"
rounded:
  etiqueta: "6px"
  control: "10px"
  velo: "16px"
  dialogo: "18px"
  tarjeta: "22px"
  nav: "24px"
  hero: "34px"
  pildora: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.musgo}"
    textColor: "{colors.superficie}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.superficie-2}"
    textColor: "{colors.texto}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "44px"
  button-small:
    backgroundColor: "{colors.salvia-suave}"
    textColor: "{colors.musgo}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "34px"
  button-add:
    backgroundColor: "{colors.salvia}"
    textColor: "{colors.salvia-texto}"
    rounded: "{rounded.dialogo}"
    size: "52px"
  chip:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.texto-2}"
    rounded: "{rounded.pildora}"
    padding: "0 14px"
    height: "36px"
  chip-selected:
    backgroundColor: "{colors.texto}"
    textColor: "{colors.fondo}"
    rounded: "{rounded.pildora}"
  card:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.texto}"
    rounded: "{rounded.tarjeta}"
    padding: "16px"
  card-highlight:
    backgroundColor: "{colors.salvia-suave}"
    rounded: "{rounded.tarjeta}"
    padding: "16px"
  hero-salvia:
    backgroundColor: "{colors.salvia}"
    textColor: "{colors.salvia-texto}"
    rounded: "{rounded.hero}"
    padding: "6px 22px 24px"
  input:
    backgroundColor: "{colors.superficie}"
    textColor: "{colors.texto}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "46px"
  nav-bottom:
    backgroundColor: "{colors.noche-de-huerto}"
    textColor: "{colors.salvia}"
    rounded: "{rounded.nav}"
    height: "68px"
---

# Design System: Simplifika

## Overview

**Creative North Star: "La libreta de calma"**

Simplifika se ve como un cuaderno ordenado en tonos de hoja seca: fondo verde muy pálido, tarjetas blancas de esquinas generosas y un solo número grande que respira. La persona llega preocupada por la plata y con el teléfono en una mano. La pantalla le baja el volumen: un número, una frase que dice qué hacer y, si quiere, el detalle plegado debajo.

La densidad es baja y vertical. Una columna de máximo 560px, bloques separados por 14px, y la navegación flotando abajo, al alcance del pulgar. La única pieza ruidosa es el número del día sobre su bloque salvia. Todo lo demás es neutro y tranquilo, y el color de estado aparece solo donde hay algo que decidir.

El sistema rechaza el aspecto de banco o fintech: nada de azul corporativo, gráficos de bolsa, dorados de inversión ni lenguaje de rendimientos. Esto es una libreta, no un terminal financiero.

**Key Characteristics:**
- Un número protagonista por pantalla, en Plus Jakarta Sans extrabold con cifras tabulares.
- Verde salvia como identidad; color de estado solo con significado.
- Superficies planas y suaves, sombra casi imperceptible y modo oscuro completo.
- Todo se usa con el pulgar: barra inferior flotante, botón de agregar al centro y diálogos que suben desde abajo en el teléfono.

## Colors

Una paleta de hoja seca: verdes grisáceos de poca saturación sobre un fondo casi blanco, con el color de estado reservado para lo que hay que decidir.

### Primary
- **Salvia** (`salvia`): la identidad. Es el bloque del número del día en Inicio (con la barra superior fundida en él), el botón de agregar, los íconos de la barra inferior y el `theme-color` del navegador.
- **Musgo** (`musgo`): el acento de acción en modo claro. Botón primario, enlaces, `summary` de los desgloses y el anillo de foco. En modo oscuro el acento se invierte y pasa a ser la salvia clara.
- **Noche de huerto** (`noche-de-huerto`): el fondo de la barra inferior flotante. Es la única superficie oscura del modo claro.

### Neutral
- **Fondo de hoja** (`fondo`): el fondo de la página, un blanco verdoso que hace flotar las tarjetas.
- **Papel** (`superficie`): tarjetas, diálogos, campos y tooltips.
- **Papel gastado** (`superficie-2`): fondo de los íconos de categoría, chips de modo, pistas de progreso y botones secundarios.
- **Línea de cuaderno** (`borde`): bordes de tarjetas y campos y separadores de listas.
- **Tinta** (`texto`), **tinta suave** (`texto-2`) y **lápiz** (`texto-3`): tres niveles de texto, del principal a las notas y los ejes de los gráficos.

### Estado y datos
- **Bien** (`bien`): ingresos, progreso sano y puntos de la revisión que están al día.
- **Alerta** (`alerta` para texto y `alerta-barra` para relleno): presupuesto al 80% o más y puntos de la revisión por mirar.
- **Crítico** (`critico` para texto y `critico-barra` para relleno): presupuesto excedido, número del día negativo, cupo de tarjeta sobre el 85% y errores.
- **Serie 1** (`serie-1`) y **serie 2** (`serie-2`): las dos series de los gráficos (gasto real y comparación). La serie 2 también marca las etiquetas de eventos.
- **Moneda** (`moneda`, con su anillo `moneda-anillo`): la moneda del logo. En la interfaz aparece solo cuando entra plata o hay un logro: el brillo junto al número del día y el aviso de logro.

### Named Rules
**La regla del color con significado.** Rojo, ámbar y verde de estado aparecen solo cuando un dato cruzó un umbral (80%, 85%, excedido, negativo). Nunca como decoración ni para dar "energía" a una pantalla.

**La regla del azul de datos.** El único azul (`serie-2`) existe para distinguir la segunda serie de un gráfico y las etiquetas de eventos. Nunca es color de marca, de botón ni de encabezado.

**La regla del modo oscuro completo.** Cada token tiene su par oscuro: tres niveles de fondo (#121512, #1b201a y #252b23), la salvia baja a #2e3b2a y el acento sube a #a8b9a0. Cualquier color nuevo se define en los dos modos o no se agrega.

## Typography

**Fuente:** Plus Jakarta Sans (400 a 800), con `system-ui, -apple-system, "Segoe UI", sans-serif` como respaldo.

**Carácter:** una sola familia geométrica y amable, que en extrabold da números con presencia y en regular se lee sin esfuerzo. La jerarquía sale del peso y del tamaño, no de mezclar familias.

### Hierarchy
- **Display** (800, clamp de 2.8 a 3.6rem, tracking −0.04em, cifras tabulares): el número del día sobre salvia. Uno por pantalla, como máximo.
- **Headline** (750, clamp de 2.4 a 3.2rem, −0.03em, cifras tabulares): el número principal de las demás pantallas.
- **Title** (800, 1.3rem, −0.02em): el título de la barra superior. En Inicio va en minúsculas, como la marca.
- **Section** (700, 1.05rem): títulos de tarjeta (`h2`). En los diálogos sube a 1.2rem.
- **Body** (400, 16px, interlineado 1.45): todo el texto corrido. Los campos usan 16px siempre, para que iPhone no haga zoom.
- **Label** (600, 0.85rem): etiquetas de campo, botones pequeños y montos en listas (600, cifras tabulares).
- **Overline** (600, 0.8rem, mayúsculas, +0.04em): separadores de fecha y subtítulos de sección.
- **Nota** (400, 0.8rem, `texto-3`): pies y aclaraciones.

### Named Rules
**La regla de las cifras tabulares.** Todo monto en pesos usa `font-variant-numeric: tabular-nums`, para que las columnas de montos se alineen y los números no salten al cambiar.

## Layout

Una sola columna centrada de máximo 560px, con 16px de margen lateral y 14px entre bloques. La barra superior es pegajosa y translúcida (fondo al 88% con desenfoque de 10px). La barra inferior flota a 12px de los bordes, con 68px de alto y un máximo de 520px, respetando el `safe-area` de iPhone. El contenido deja espacio abajo para que la barra nunca tape lo último.

En Inicio, la barra superior y el bloque del número se funden en una sola superficie salvia que llega hasta los bordes y termina en esquinas de 34px. Desde 600px de ancho el bloque se separa y pasa a ser una tarjeta salvia con 28px de radio.

Los diálogos se centran en pantallas anchas (máximo 520px). Bajo 480px suben desde abajo a todo el ancho, con esquinas solo arriba. Las filas de chips se desplazan en horizontal sin barra de desplazamiento y a sangre en el teléfono.

## Motion
"La plata se mueve": el movimiento cuenta lo que le pasa a tu plata y lo demás es rápido y discreto. Curva `--frenar` (`cubic-bezier(.16, 1, .3, 1)`): llega y frena.
- **Número del día:** cuando cambia, cuenta desde el valor anterior hasta el nuevo (0,65 s). Si entró plata, la moneda brilla a su lado. Con el ojo cerrado no cuenta.
- **Diálogos:** suben como hoja en el celular (0,34 s) y bajan más rápido al cerrar (0,18 s). En pantallas anchas aparecen al centro.
- **Cambiar de pantalla:** el contenido se funde y la pestaña activa se desliza en la barra inferior (View Transitions, donde el navegador las tiene). Al llegar, las barras de presupuesto se llenan.
- **Al presionar:** los botones se hunden a 0,96 (el "+" a 0,9).
- **El ojo:** la pantalla se desenfoca al cerrar y se enfoca al abrir.
- **Logros:** solo terminar una deuda o que te paguen todo. La moneda cae y se dibuja un check en el aviso. Lo de todos los días no se celebra.
- **Pantalla de carga ("el compañero escribe"):** fondo musgo como el ícono; el globo aparece con tres puntos que escriben, se juntan en la k, la k se traza y cae la moneda (~2 s, solo la primera vez del día). Las demás veces el logo sale quieto y se funde apenas hay datos. Si la app nunca la quita, se rinde sola a los 8 s.
- **Reducir movimiento:** sin desplazamientos, conteos ni hundimientos; los cambios se notan con fundidos. La pantalla de carga sale quieta.

## Elevation & Depth

Casi plano. La profundidad viene de la capa tonal (fondo de hoja → papel → papel gastado) y de bordes de 1px, no de sombras. Las tarjetas llevan una sombra apenas perceptible, que desaparece en modo oscuro. Solo tres piezas flotan de verdad: la barra inferior, los diálogos y los tooltips.

### Shadow Vocabulary
- **Susurro** (`0 1px 2px rgb(31 40 28 / .04), 0 8px 24px rgb(31 40 28 / .05)`): tarjetas en modo claro. En modo oscuro no hay sombra.
- **Barra flotante** (`0 10px 30px rgb(0 0 0 / .18)`): solo la navegación inferior.
- **Diálogo** (`0 20px 60px rgb(0 0 0 / .3)`, fondo trasero negro al 45%): diálogos modales.
- **Tooltip** (`0 6px 20px rgb(0 0 0 / .15)`): tooltips de los gráficos.

### Named Rules
**La regla de las tres cosas que flotan.** Solo la barra inferior, los diálogos y los tooltips llevan sombra real. Una tarjeta nueva no flota: se separa por tono y borde.

## Shapes

Redondeado generoso y escalonado por tamaño: mientras más grande la pieza, más curva. El bloque salvia (34px), la barra inferior (24px), las tarjetas (22px), los diálogos y el botón de agregar (18px), el velo de estado (16px), los controles y campos (10px), los descuentos (8px) y las etiquetas (6px). Chips y contadores son píldoras completas. Los botones de ícono son círculos de 44px. Las barras de progreso tienen 8px de alto y extremos redondeados.

Los íconos son trazos de 1.9px con puntas redondeadas sobre una grilla de 24px, sin relleno, salvo el logo.

## Components

### Buttons
Suaves y redondeados, nunca agresivos.
- **Forma:** 10px de radio y 44px de alto mínimo para el pulgar (34px en el pequeño).
- **Primario:** musgo con texto blanco, peso 600. Uno por vista o por diálogo.
- **Secundario:** papel gastado con borde de línea de cuaderno.
- **Pequeño:** salvia suave con texto musgo. Acciones dentro de tarjetas, como "Pagar" o "Ver".
- **Peligro:** sin relleno, con texto y borde crítico. Solo para borrar.
- **Deshabilitado:** opacidad al 50%.
- **Foco:** anillo de 2px del color de acento, separado 2px.

### Chips
- **Estilo:** píldora de 36px, papel con borde y texto `texto-2`.
- **Seleccionado** (`aria-pressed="true"`): se invierte a tinta sobre fondo, sin color de acento.
- **Selector de día** (descuentos): siete chips iguales, con un punto de 4px bajo el día de hoy.

### Cards / Containers
- **Esquinas:** 22px.
- **Fondo:** papel. Las destacadas van en salvia suave sin borde y las de error, con borde crítico.
- **Sombra:** susurro (ver Elevation).
- **Borde:** 1px de línea de cuaderno.
- **Relleno interno:** 16px, con 10px entre los elementos.

### Inputs / Fields
- **Estilo:** 46px de alto, 10px de radio, borde de línea de cuaderno sobre papel y texto de 16px.
- **Etiqueta:** encima, en 0.85rem/600 y `texto-2`. La ayuda va debajo, en 0.8rem.
- **Foco:** el anillo global de 2px del acento.

### Navigation
- **Barra inferior flotante:** noche de huerto con 24px de radio y cinco columnas: Inicio, Gastos, botón de agregar, Presupuesto y Plan.
- **Ítems:** ícono de 22px sobre una etiqueta de 0.66rem/600, en salvia. El activo pasa a `nav-activo` sobre un velo blanco al 10%, con 16px de radio.
- **Agregar:** un cuadrado redondeado salvia de 52px (18px de radio) al centro. Es la acción principal de la app.
- **Barra superior:** el logo de 32px (`icons/icon.svg`: la k en un globo de chat, con la moneda, sobre musgo), título, el ojo y "Más". El título toma el espacio libre y, si no cabe, termina en "…". El ojo es un círculo de 44px sin borde (abierto o cerrado) y "Más", un círculo de 44px con borde. Dónde están guardados los datos (local o nube) se dice en Ajustes, no en la barra.
- **Montos ocultos (el ojo):** toda cifra de plata pasa a `$•••••`, del mismo largo y sin signo, con los puntos achicados para ocupar lo que un monto real (más chicos aún en el número del día). Se ven igual las proporciones (barras, gráficos, %) y los topes de los descuentos, que son del banco. Es la versión para compartir pantallazos: tiene que verse completa.

### Hero salvia (signature)
El número del día. Bloque salvia de borde a borde con la etiqueta, el número en display, una línea de detalle y un desglose plegable (`details`) con el cálculo paso a paso. Debajo va el **estado de ritmo**: una franja con velo blanco (`salvia-velo`), 16px de radio y un ícono, que dice si vas bien o te estás adelantando. Si el número es negativo no se pinta de rojo dentro del bloque: el texto lo dice.

### Mis tarjetas en 3D (Descuentos)
Cada persona agrega sus tarjetas eligiendo el banco y después el tipo, viendo cada tipo ya dibujado. Se guardan como `banco:tipo` (`cmr:elite`); los descuentos siguen siendo por banco. Están en `js/tarjetas.js`.
- **Parecidas a las reales, sin logos** (decisión del usuario): la forma (vertical u horizontal), los colores, el acabado y el arte de cada tarjeta (piedras, hojas, flor o vetas de Santander, dibujados en SVG, no las fotos). El banco y la red van en texto; Banco de Chile, con serifas. No se usa ningún logo (la "B", la llama, el "CMR" estilizado, los círculos de Mastercard). Hay tipos dibujados de CMR Falabella, Santander, Banco de Chile y BancoEstado; los demás bancos tienen una tarjeta genérica en su color.
- **Excepción de color:** las tarjetas usan los colores de cada banco, fuera de la paleta de la app. Es lo único que no sigue la regla del color con significado.
- **3D (estilo [tilt-card](https://spell.sh/docs/tilt-card)):** se inclina hasta 15° alejándose del puntero o del dedo, se agranda a 1,05 y lleva un brillo que lo sigue. Es la única excepción a "las tres cosas que flotan": se eleva solo mientras se toca. Con "reducir movimiento" queda quieta, con un brillo suave fijo.
- Nunca muestra el número completo ni el vencimiento.

### Progreso de presupuesto
Pista de 8px en papel gastado con relleno verde, ámbar al 80% y rojo al pasarse. Siempre va acompañada del texto del estado, nunca solo el color.

### Aviso (toast)
Píldora de 12px de radio en tinta invertida, sobre la barra inferior, que entra subiendo 20px en 0.2s. Para errores pasa a crítico con texto blanco.

## Do's and Don'ts

### Do:
- **Do** deja un solo número protagonista por pantalla (display o headline) y pliega el resto en un desglose.
- **Do** usa cifras tabulares en todo monto.
- **Do** define cada color nuevo en modo claro y oscuro como variable en `:root`.
- **Do** mantén las acciones táctiles en 44px como mínimo y las principales al alcance del pulgar.
- **Do** acompaña cada color de estado con texto que diga qué pasa y qué hacer.
- **Do** separa las superficies por tono y borde de 1px antes de recurrir a una sombra.

### Don't:
- **Don't** le des aspecto de banco o fintech: nada de azul corporativo, gráficos de velas o de bolsa, dorados de "inversión" ni lenguaje de rendimientos.
- **Don't** uses `serie-2` (azul) como color de marca, de botón ni de encabezado.
- **Don't** pintes de rojo el bloque salvia ni uses el rojo para algo que no cruzó un umbral.
- **Don't** agregues sombras a tarjetas nuevas ni esquinas rectas: el radio mínimo de un contenedor es 10px.
- **Don't** mezcles otra familia tipográfica. La jerarquía sale del peso y el tamaño de Plus Jakarta Sans.
