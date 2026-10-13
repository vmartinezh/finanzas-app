# Lucas 💸

App de finanzas personales para ordenar la plata **sin tener que anotar cada gasto**.
Hecha en Chile, para amigos, gratis y de código abierto.

- **Cuánto puedes gastar hoy**: ingreso − pagos fijos − cuotas de deudas − ahorro − lo ya gastado, dividido por los días que quedan del mes.
- **Presupuesto por categoría**, con avisos al 80% y al pasarte.
- **Pagos fijos mes a mes**: arriendo, cuentas y compras en cuotas, con lo que ya tienes comprometido los próximos 6 meses.
- **Plan para salir de las deudas**: avalancha o bola de nieve con un total mensual fijo, deudas en pausa (acuerdos con la familia), deudas con fecha límite, uso del cupo de las tarjetas con alerta al 85%, y la fecha en que quedas libre.
- **Revisión de fin de mes**: checklist con ingreso, gastos, pagos de cada deuda, saldos según la cartola y alertas.
- **Gráficos**: en qué se te va la plata, si vas al ritmo del presupuesto y los últimos 6 meses.
- **Eventos** (matrimonio, viaje, mudanza): sus gastos se ven aparte para que no distorsionen un mes normal.
- **"¿Qué fue esta compra?"**: escribes en tus palabras ("uber al aeropuerto para lo del matri") y la app lo clasifica sola (*Transporte · Matrimonio*). Además aprende cada comercio para la próxima vez.

> 🚧 **Estado:** fase 1 (la app base). La captura automática de compras desde los correos del banco y las notificaciones vienen en las fases 2 y 3. Ver [docs/DISENO.md](docs/DISENO.md).

## Probarla

Es una página web que se puede instalar en el celular (PWA): funciona en Android y iPhone y no pasa por las tiendas de apps.

- **Android (Chrome):** menú ⋮ → *Agregar a la pantalla principal*.
- **iPhone (Safari):** botón compartir → *Agregar a inicio*.

Para ver cómo se ve con datos ficticios, abre la app con `?demo=1` al final de la dirección, o ve a *Más → Ajustes → Cargar datos de ejemplo*.

## Dos formas de usarla

| | Modo local | Modo nube |
|---|---|---|
| Dónde quedan los datos | Solo en tu navegador | En una base de datos Supabase |
| Cuenta | No necesita | Entras con un enlace a tu correo |
| Varios dispositivos | No | Sí |
| Configuración | Ninguna | 10 minutos (abajo) |

Si `js/config.js` está vacío, la app funciona en modo local. En ese modo, **descarga un respaldo** de vez en cuando desde *Ajustes*.

## Publicar tu propia copia

### 1. La app (GitHub Pages, gratis)

1. Haz un *fork* de este repositorio o súbelo a tu cuenta de GitHub.
2. En el repo: *Settings → Pages → Branch: `main` / root → Save*.
3. En un par de minutos queda en `https://TU-USUARIO.github.io/finanzas-app/`.

### 2. La nube (Supabase, opcional y gratis)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ve a *SQL Editor*, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y presiona *Run*.
3. En *Authentication → URL Configuration*, pon la dirección de tu GitHub Pages en *Site URL* y en *Redirect URLs*.
4. En *Project Settings → API*, copia la **Project URL** y la **anon public key** a `js/config.js`.
5. Sube el cambio. Listo: cada amigo entra con su correo y **solo ve sus propios datos** (lo garantiza la base de datos con Row Level Security).

> La *anon key* es pública por diseño y puede ir en el repo. **Nunca** subas la *service_role key*.

## Probar en tu computador

No necesita instalar nada para compilar: es HTML, CSS y JavaScript puro. Solo hay que servir la carpeta con cualquier servidor estático, por ejemplo:

```bash
npx serve .            # con Node.js
python -m http.server  # con Python
```

y abrir `http://localhost:3000` (o el puerto que indique). Las pruebas automáticas están en `/tests/` y corren en el navegador.

## Estructura

```
index.html            la app (una sola página)
css/app.css           estilos, modo claro y oscuro
js/app.js             arranque y navegación
js/db.js              datos: modo local (localStorage) o nube (Supabase)
js/calculos.js        disponible del mes, presupuesto, plan de deudas
js/clasificador.js    adivina la categoría de una compra y aprende
js/graficos.js        gráficos SVG livianos, sin librerías
js/views/             cada pantalla
supabase/schema.sql   tablas y seguridad para la nube
tests/index.html      pruebas
docs/DISENO.md        diseño y fases siguientes
```

## Privacidad

- La app **nunca te pide las claves del banco**.
- En modo local, nada sale de tu teléfono.
- Si trabajas en el código, guarda tus respaldos o planes personales en `privado/`: git ignora esa carpeta y los archivos `plan_financiero*.md`.
- En modo nube, los datos quedan en el proyecto Supabase de quien publicó la app. Si un amigo te publica la app, él administra esa base de datos. Si prefieres que nadie más la administre, publica tu propia copia (arriba).

## Licencia

MIT. Úsala, cópiala y mejórala.
