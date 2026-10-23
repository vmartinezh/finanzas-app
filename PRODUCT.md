# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personas en Chile que viven al día y tienen deudas: tarjetas de crédito, compras en cuotas, créditos de consumo y préstamos familiares. Quieren saber cuánto pueden gastar hoy sin anotar cada gasto a mano y ver cuándo terminan de pagar. El primer grupo es una beta cerrada.

## Product Purpose

Simplifika convierte el mes en un solo número: cuánto puedes gastar hoy. Lo calcula a partir del ingreso, los pagos fijos, las cuotas de las deudas, el ahorro y lo ya gastado, dividido por los días que quedan del mes. Alrededor de ese número están el presupuesto por categoría, el plan para salir de las deudas con su fecha de término, la revisión de fin de mes y los descuentos del día de las tarjetas que la persona tiene.

Éxito: que la persona abra la app unos segundos al día, sepa qué decisión tomar y vea que sus deudas avanzan.

## Positioning

- **Un número, no un registro.** La app guía con "puedes gastar $X hoy". No es una planilla de gastos.
- **Hecha para el sistema chileno:** cuotas, cupos de tarjeta, deudas en pausa con la familia y el catálogo de descuentos por día de los bancos y casas comerciales chilenas, revisado cada semana con el link a la fuente oficial.
- **Sin anotar todo a mano.** Las compras se clasifican desde una frase ("uber al aeropuerto para lo del matri"). La meta es que lleguen solas desde el correo del banco (fase 2) y que una notificación pregunte qué fueron (fase 3).
- **La app base es gratis y completa.** El apoyo pagado nunca bloquea lo esencial.

## Operating Context

- Se usa en el celular, instalada como PWA en Android y iPhone, en ratos cortos: de pie, en la calle, con una mano, antes o después de comprar.
- La persona suele llegar preocupada por la plata. La app no culpa ni alarma de más: dice qué hacer.
- Hay dos momentos más largos: la configuración inicial y la revisión de fin de mes, con la cartola del banco a mano.
- Modo local (los datos solo en el navegador) o modo nube (cuenta con correo y contraseña, Supabase con Row Level Security).

## Capabilities and Constraints

- **Fase 1 (lista):**
  - Lo que puedes gastar hoy y el presupuesto por categoría, con avisos al 80% y al pasarte.
  - Pagos fijos y cuotas, con lo comprometido los próximos 6 meses.
  - Plan de deudas avalancha o bola de nieve con un total mensual fijo, deudas en pausa y con fecha límite, y alerta de uso del cupo al 85%.
  - Revisión de fin de mes, eventos aparte (matrimonio, viaje), gráficos, clasificador que aprende comercios, descuentos de las tarjetas y respaldo en JSON.
- **Próximas fases:** captura automática desde el correo del banco (fase 2), notificación con IA (fase 3) y lanzamiento con términos y suscripción de apoyador (fase 4). Detalle en `docs/DISENO.md`.
- **Técnica:** HTML, CSS y JavaScript puro, sin compilación; CSP estricta; gráficos SVG propios, sin librerías.
- **Vocabulario:** "plata", "puedes gastar hoy", "pagos fijos", "cuotas", "cupo", "cartola", "plan" (para las deudas), "eventos".

## Brand Commitments

- **Nombre: Simplifika**, con K (decidido el 2026-10-14, en la app desde el 2026-10-22). La K también se lee como "miles" (10K). El dominio simplifika.app está por comprar; mientras, la app sigue en su dirección de Vercel. Las claves internas (`simplifica:v1:` en el navegador, la caché `simplifica-vN`) quedan con C para no perder datos guardados.
- **Logo:** la k minúscula dentro de un globo de chat, con una moneda dorada arriba a la derecha, sobre un cuadro musgo (`icons/icon.svg`). Dice "compañero de finanzas": alguien a quien le preguntas antes de decidir. Elegido el 2026-10-16; reemplazó al chanchito.
- **Animación de carga:** por rediseñar con el logo nuevo (la idea anterior era para el chanchito). Completa solo la primera vez del día y quieta con "reducir movimiento".
- **Voz:** español de Chile, tuteando, simple y calmado. Frases cortas que dicen qué hacer, sin culpa ni sermones.

## Evidence on Hand

- La app funcionando en fase 1 y los datos de ejemplo (`?demo=1`, `js/semillas.js`).
- El catálogo de descuentos con 10 tarjetas y unos 90 descuentos, cada uno con su fuente oficial.
- **No existen** testimonios, usuarios publicados, cifras de uso ni prensa: no se inventan.

## Product Principles

1. **Un número que guía.** "Puedes gastar $X hoy" va primero; todo lo demás es detalle.
2. **Capturar solo, preguntar poco.** Cada dato que la persona tiene que escribir es un costo.
3. **Las deudas tienen salida.** Siempre se muestran el plan y la fecha de término.
4. **Separar lo extraordinario.** Los eventos van aparte para no distorsionar un mes normal.
5. **Privacidad primero.** Nunca se piden las claves del banco y cada cuenta ve solo lo suyo.

## Accessibility & Inclusion

- Uso rápido con una mano en el celular: lo importante, legible de un vistazo, y las acciones principales al alcance del pulgar.
- Momentos de estrés: tono calmado. Las alertas distinguen lo urgente de lo informativo y siempre proponen un paso siguiente.
- Respetar "reducir movimiento" y el modo claro y oscuro del sistema.
