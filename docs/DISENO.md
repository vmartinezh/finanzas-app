# Diseño de Simplifica

## El problema

Anotar cada gasto a mano no funciona: se deja de hacer a la segunda semana y,
aunque se haga, una lista de gastos no dice qué decisión tomar. Además, los meses
con eventos grandes (como un matrimonio con tres fiestas) distorsionan todo: no
se sabe cuánto es "normal".

## Principios

1. **Un número que guía**: "puedes gastar $X hoy". Todo lo demás es detalle.
2. **Capturar solo, preguntar poco**: las compras deberían llegar solas y la
   persona solo da contexto en una frase.
3. **Las deudas tienen salida**: siempre mostrar el plan y la fecha de término.
4. **Separar lo extraordinario**: los eventos van aparte.
5. **Privacidad primero**: nunca pedir claves bancarias; cada usuario ve solo lo suyo.

## Cómo se calcula "puedes gastar hoy"

```
para el día a día = ingreso − pagos fijos − cuotas de deudas − abono extra − ahorro
te queda          = para el día a día − gastos variables del mes
puedes gastar hoy = te queda ÷ días que quedan del mes (incluido hoy)
```

Un movimiento marcado como pago de un compromiso o de una deuda no se cuenta como
gasto variable, porque ya estaba descontado.

## Fases

### ✅ Fase 1: app base (lista)
Disponible del día, presupuesto, pagos fijos y cuotas, deudas con plan avalancha
o bola de nieve, gráficos, eventos, clasificador por palabras clave que aprende
comercios, modo local y modo nube (Supabase con RLS), y respaldo en JSON.
También: total mensual para deudas (las cuotas que terminan pasan a la
siguiente), deudas en pausa y con fecha límite, uso del cupo con alerta al 85%,
revisión de fin de mes, e ingresos extra que no inflan lo que puedes gastar.

### Fase 2: captura automática desde el correo del banco
Los bancos chilenos y las casas comerciales mandan un correo por cada compra con
tarjeta. Plan:

```
Correo del banco → Google Apps Script en el Gmail de cada persona (gratis, cada 5 min)
  → extrae monto, comercio, fecha y tarjeta con un lector por banco
  → lo envía a una Edge Function de Supabase con una clave personal de ingreso
  → queda como movimiento "por revisar" (origen = correo, id_externo = id del correo)
```

- El script corre **en la cuenta de Google de cada persona**: nadie más lee sus correos.
- `id_externo` evita duplicados si el mismo correo se procesa dos veces.
- Se necesita un ejemplo real de correo de cada banco (con los datos tapados)
  para escribir sus lectores.

Alternativa futura: el Sistema de Finanzas Abiertas de Chile (Ley Fintec), o
agregadores como Fintoc cuando tengan una opción accesible para personas.

### Fase 3: notificación + IA
- Cuando entra una compra, una **notificación push** (Web Push, funciona en
  Android y en iPhone con la app agregada a la pantalla de inicio) pregunta
  "¿Qué fue esta compra de $12.990 en UBER?".
- La respuesta pasa primero por el clasificador local. Si no la resuelve, se
  manda a un modelo de lenguaje (Claude Haiku) desde una Edge Function, junto
  con las categorías y los eventos de la persona, y vuelve "Transporte · Matrimonio".
- Cada respuesta se guarda como regla, así que con el tiempo la IA se usa cada vez menos.

### Fase 4: lanzamiento
- Prueba cerrada con un grupo pequeño de usuarios y ronda de comentarios.
- Términos de uso y política de privacidad (datos financieros: Ley 19.628 y Ley 21.719).
- Plan gratis completo + suscripción opcional de **apoyador**: financia el desarrollo
  y da extras que no bloquean lo esencial (temas de color, insignia, acceso anticipado).
- Exportar a Excel.
