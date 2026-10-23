# Simplifika 🌿

App de finanzas personales para ordenar la plata **sin tener que anotar cada gasto**.
Hecha en Chile y de código abierto. La app base es gratis y completa: ordenar tus cuentas nunca va a estar detrás de un pago.

- **Cuánto puedes gastar hoy**: ingreso − pagos fijos − cuotas de deudas − ahorro − lo ya gastado, dividido por los días que quedan del mes.
- **Presupuesto por categoría**, con avisos al 80% y al pasarte.
- **Pagos fijos mes a mes**: arriendo, cuentas y compras en cuotas, con lo que ya tienes comprometido los próximos 6 meses.
- **Plan para salir de las deudas**: avalancha o bola de nieve con un total mensual fijo, deudas en pausa (acuerdos con la familia), deudas con fecha límite, uso del cupo de las tarjetas con alerta al 85%, y la fecha en que quedas libre.
- **Me deben**: anotas lo que prestaste o pagaste por otros, en una vez o en cuotas, y divides un gasto entre varios (el asado). Inicio te avisa lo que vence hoy o está atrasado, y cuando te pagan, esa plata vuelve a lo que puedes gastar.
- **Revisión de fin de mes**: checklist con ingreso, gastos, pagos de cada deuda, saldos según la cartola y alertas.
- **Gráficos**: en qué se te va la plata, si vas al ritmo del presupuesto y los últimos 6 meses.
- **Eventos** (matrimonio, viaje, mudanza): sus gastos se ven aparte para que no distorsionen un mes normal.
- **Descuentos de tus tarjetas**: marcas las tarjetas que tienes (Santander, CMR, Banco de Chile…) y te dice en qué tienes descuento hoy y el resto de la semana, como el 40% de los jueves en Burger King con Santander. El catálogo se revisa cada semana contra la página de beneficios de cada banco.
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
| Cuenta | No necesita | Correo y contraseña |
| Varios dispositivos | No | Sí |
| Configuración | Ninguna | 15 minutos (abajo) |

Si `js/config.js` está vacío, la app funciona en modo local. En ese modo, **descarga un respaldo** de vez en cuando desde *Ajustes*.

## Publicarla para que cualquiera la use (Vercel + Supabase)

La app se publica en **Vercel** y guarda los datos en **Supabase**. Los dos son gratis para este uso. Cada persona crea su cuenta y **solo ve sus propios datos**: lo garantiza la base de datos con Row Level Security, no la app.

### 1. Supabase (la base de datos)

1. Crea una cuenta y un proyecto en [supabase.com](https://supabase.com). Elige la región **South America (São Paulo)**, que es la más cercana a Chile.
2. Ve a *SQL Editor → New query*, pega todo [`supabase/schema.sql`](supabase/schema.sql) y presiona *Run*. Si ya la tenías instalada, vuelve a correrlo cuando cambie: solo agrega lo nuevo y no borra datos.
3. Ve a *Authentication → Sign In / Providers → Email* y **desactiva "Confirm email"**. El servicio de correo que trae Supabase solo envía a los miembros de tu proyecto y como máximo 2 correos por hora, así que con la confirmación activada nadie fuera de tu equipo podría crear su cuenta. Si más adelante configuras tu propio SMTP (por ejemplo Brevo o Resend), puedes volver a activarla.
4. En *Project Settings → API* (o *Data API*) copia la **Project URL** y la **anon public key** a `js/config.js` y sube el cambio a GitHub.

> La *anon key* es pública por diseño y puede ir en el repo. **Nunca** subas la *service_role key*.

### 2. Vercel (la página)

1. Crea una cuenta en [vercel.com](https://vercel.com) entrando con GitHub.
2. *Add New → Project*, elige el repositorio `finanzas-app` y presiona *Deploy*. No hay que configurar nada: no tiene paso de compilación.
3. Queda publicada en `https://finanzas-app-XXXX.vercel.app`. Cada vez que subas cambios a GitHub, Vercel la actualiza sola.
4. De vuelta en Supabase, en *Authentication → URL Configuration*, pon esa dirección en *Site URL*.

### Alternativa: GitHub Pages

También funciona en GitHub Pages (*Settings → Pages → Branch: `main` / root*), en `https://TU-USUARIO.github.io/finanzas-app/`.

### 3. Correo para recuperar la contraseña (Brevo)

La app tiene "¿Olvidaste tu contraseña?", pero el correo que trae Supabase solo llega a los miembros del proyecto. Con un SMTP propio le llega a cualquiera:

1. Crea una cuenta gratis en [brevo.com](https://www.brevo.com) (300 correos al día).
2. En *Senders, Domains & Dedicated IPs → Senders* agrega y verifica el correo que va a aparecer como remitente.
3. En *SMTP & API → SMTP* genera una clave SMTP.
4. En Supabase, *Authentication → Emails → SMTP Settings*, activa *Custom SMTP* con: host `smtp-relay.brevo.com`, puerto `587`, usuario = el *login* SMTP que muestra Brevo, contraseña = la clave SMTP, remitente = el correo verificado y nombre `Simplifika`.
5. En *Authentication → URL Configuration*, agrega la dirección de la app en *Redirect URLs* (además de *Site URL*): el enlace del correo solo puede volver a direcciones de esa lista.

Con dominio propio conviene cambiar a un remitente de ese dominio (por ejemplo con Resend), para que los correos no lleguen a spam.

### 4. Avisos al celular (opcional)

En "Me deben", la app puede avisar al celular el día que toca cobrar. El aviso solo dice "Hoy te toca cobrar algo 👀", sin nombres ni montos. Funciona solo en modo nube; en iPhone, con la app agregada a la pantalla de inicio.

1. Genera las claves VAPID, por ejemplo con `npx web-push generate-vapid-keys`. La pública va en `VAPID_PUBLIC_KEY` de `js/config.js`; **la privada nunca va al repo**.
2. En Supabase, *Database → Extensions*, activa `pg_cron` y `pg_net`.
3. En *Edge Functions → Deploy a new function → Via Editor*, crea `avisar-cobros` con el contenido de [`supabase/functions/avisar-cobros/index.ts`](supabase/functions/avisar-cobros/index.ts) (reemplaza todo el código de ejemplo que trae el editor; si responde "Hello", quedó el ejemplo) y desactiva *Verify JWT* (la función revisa su propia clave).
4. En *Edge Functions → Secrets* agrega `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (`mailto:` + tu correo) y `AVISOS_SECRETO` (una clave larga al azar, de 32 caracteres o más).
5. En *SQL Editor*, guarda en Vault la dirección del proyecto y la misma clave:
   ```sql
   select vault.create_secret('https://<tu-proyecto>.supabase.co', 'url_proyecto');
   select vault.create_secret('<la misma AVISOS_SECRETO>', 'avisos_secreto');
   ```
6. Vuelve a correr `supabase/schema.sql`: con las extensiones activas, programa el aviso diario (13:00 UTC, en la mañana en Chile).

### 5. Gastos desde el correo (opcional, en desarrollo)

Las compras con tarjeta llegan solas como "por revisar", desde los avisos de compra del banco. Un script corre en la cuenta de Google de cada persona ([`correo/simplifika.gs`](correo/simplifika.gs)) y le manda esos correos a la función `recibir-compra`, que saca monto, comercio y fecha con [`lectores.js`](supabase/functions/recibir-compra/lectores.js) y no guarda el correo. Funciona solo en modo nube.

1. Vuelve a correr `supabase/schema.sql` (crea la tabla `claves_ingreso`).
2. En *Edge Functions → Deploy a new function → Via Editor*, crea `recibir-compra` con **dos archivos**: `index.ts` y `lectores.js`, copiados de [`supabase/functions/recibir-compra/`](supabase/functions/recibir-compra/). Desactiva *Verify JWT* (la función revisa la clave de cada persona). No necesita secretos propios.
3. En `js/config.js`, cambia `GASTOS_POR_CORREO` a `true` (antes, la sección no aparece).
4. Cada persona entra a *Ajustes → Gastos desde tu correo*, toca "Conectar mi correo" y sigue los tres pasos.
5. Cuando cambie un lector (`lectores.js`), vuelve a publicar la función: el script de cada persona no cambia.

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
js/avisos.js          avisos al celular (notificaciones push, solo en la nube)
js/calculos.js        disponible del mes, presupuesto, plan de deudas
js/clasificador.js    adivina la categoría de una compra y aprende
js/graficos.js        gráficos SVG livianos, sin librerías
js/beneficios.js      catálogo de descuentos por día de cada tarjeta (se revisa cada semana)
js/views/             cada pantalla
supabase/schema.sql   tablas y seguridad para la nube
supabase/functions/   avisos al celular (avisar-cobros) y compras desde el correo (recibir-compra)
correo/simplifika.gs  script de Google que manda los avisos de compra del banco
tests/index.html      pruebas
docs/DISENO.md        diseño y fases siguientes
```

## Privacidad

- La app **nunca te pide las claves del banco**.
- En modo local, nada sale de tu teléfono.
- Si trabajas en el código, guarda tus respaldos o planes personales en `privado/`: git ignora esa carpeta y los archivos `plan_financiero*.md`.
- En modo nube, los datos quedan en la base de datos Supabase de quien publica la app, protegidos para que cada cuenta vea solo lo suyo. Si prefieres que nadie más la administre, puedes publicar tu propia copia (arriba).

## Licencia

MIT. Úsala, cópiala y mejórala.
