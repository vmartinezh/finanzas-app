# Seguridad

Simplifika maneja información financiera personal, así que tomamos en serio cualquier problema de seguridad.

## Reportar una vulnerabilidad

**No abras un issue público.** Repórtala de forma privada desde la pestaña
[*Security → Report a vulnerability*](https://github.com/vmartinezh/finanzas-app/security/advisories/new)
de este repositorio. Solo los mantenedores la ven.

Incluye, si puedes, los pasos para reproducirla y qué datos podrían quedar expuestos. Respondemos lo antes posible.

## Cómo se protegen los datos

- **Sin claves bancarias:** la app nunca pide ni guarda contraseñas del banco.
- **Modo local:** los datos quedan solo en el navegador del dispositivo.
- **Modo nube:** cada cuenta ve solo sus filas. Lo garantiza la base de datos con Row Level Security (ver [`supabase/schema.sql`](supabase/schema.sql)), no la app.
- **Claves:** el repositorio solo puede contener la *anon key* de Supabase, que es pública por diseño. La *service_role key* nunca va en el código.
- **Respaldos importados:** cada fila se valida (`js/validar.js`) antes de entrar a la app.
- **Content Security Policy:** el navegador solo ejecuta código de la propia app y del SDK de Supabase.
