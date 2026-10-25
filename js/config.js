// Configuración de la nube (Supabase).
// Si dejas estos valores vacíos, la app funciona en "modo local":
// los datos quedan guardados solo en este navegador.
//
// La "anon key" de Supabase es pública por diseño: lo que protege los datos
// son las políticas RLS de supabase/schema.sql. Nunca pongas aquí la
// "service_role key".
export const SUPABASE_URL = 'https://javedclcwbkuvxxdfddd.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphdmVkY2xjd2JrdXZ4eGRmZGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5MTg2OTIsImV4cCI6MjEwNzQ5NDY5Mn0.dv_RjXU3aWjmRyjBjTRdIRXfod2tE9Sr-GlL3OB_aUg';

// Clave pública de los avisos al celular (VAPID). Pública por diseño: la
// privada va solo en los secretos de Supabase. Vacía = sin avisos.
export const VAPID_PUBLIC_KEY = 'BKS8iBctYQyXekTeVOm3Flxn2obAmHrpUIsiNai6nZ0GR_JecRZlyzEt6Fu3vAnsPb5hxqUSaDPOzlLBlsXZjqo';

// Compras que llegan solas (fase 2): desde el correo del banco y desde el Atajo
// de Wallet del iPhone. Enciéndelo cuando en Supabase ya corriste schema.sql y
// publicaste la función recibir-compra (ver README): antes, Ajustes no muestra
// esas secciones.
export const COMPRAS_SOLAS = true;
