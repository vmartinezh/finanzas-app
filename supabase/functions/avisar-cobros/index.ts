// Avisa al celular de quienes hoy tienen un pago por recibir ("Me deben").
// La llama pg_cron una vez al día (ver el final de supabase/schema.sql).
//
// Secretos (Edge Functions → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUBJECT (mailto:tu@correo) y AVISOS_SECRETO (el mismo que va en Vault).
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase.
//
// El aviso no dice quién ni cuánto: el texto pasa por los servidores de
// Google, Apple o Mozilla y queda en la pantalla bloqueada.
import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const SECRETO = Deno.env.get('AVISOS_SECRETO') ?? '';
const AVISO = JSON.stringify({ titulo: 'Hoy te toca cobrar algo 👀', url: './#/cobros' });

// Solo se envía a los servicios de notificaciones de los navegadores: una
// dirección cualquiera haría que esta función llame a donde alguien quiera.
const SERVICIOS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^([a-z0-9-]+\.)*push\.apple\.com$/,
  /^([a-z0-9-]+\.)*notify\.windows\.com$/,
];
const servicioConocido = (endpoint: string) => {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && SERVICIOS.some(r => r.test(url.hostname));
  } catch {
    return false;
  }
};

// Compara sin cortar en la primera diferencia, para no dar pistas por el tiempo de respuesta.
function iguales(a: string, b: string) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let distinto = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) distinto |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return distinto === 0;
}

Deno.serve(async req => {
  if (req.method !== 'POST' || SECRETO.length < 32 || !iguales(req.headers.get('x-avisos-secreto') ?? '', SECRETO)) {
    return new Response('No autorizado', { status: 401 });
  }

  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  const { data, error } = await supabase.rpc('suscripciones_para_avisar');
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const resultado = { enviados: 0, borrados: 0, fallidos: 0, ignorados: 0 };
  const vencidos: string[] = [];
  await Promise.all((data ?? []).map(async (s: { id: string; endpoint: string; p256dh: string; auth: string }) => {
    if (!servicioConocido(s.endpoint)) { resultado.ignorados++; return; }
    try {
      // TTL: si el celular está apagado, el aviso espera hasta 12 horas; después ya no es "hoy".
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, AVISO, { TTL: 12 * 3600 });
      resultado.enviados++;
    } catch (e) {
      // 404 / 410: la persona desinstaló la app o quitó el permiso. Se borra.
      const estado = (e as { statusCode?: number }).statusCode;
      if (estado === 404 || estado === 410) vencidos.push(s.id);
      else resultado.fallidos++;
    }
  }));
  if (vencidos.length) {
    const { error: e } = await supabase.from('suscripciones_push').delete().in('id', vencidos);
    if (!e) resultado.borrados = vencidos.length;
  }
  return Response.json(resultado);
});
