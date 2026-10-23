// Recibe un correo de compra que el script de Google de la persona encontró en su
// Gmail (correo/simplifika.gs), saca el gasto con lectores.js y lo deja como
// movimiento "por revisar". No guarda el correo: solo monto, comercio y fecha.
//
// La clave de ingreso identifica a la persona (en la base está solo su hash).
// Con ella solo se pueden agregar gastos por revisar, no leer nada.
//
// Publicar con "Verify JWT" desactivado (la función revisa su propia clave).
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { leerCorreoDeCompra } from './lectores.js';

const CLAVE = /^[A-Za-z0-9_-]{40,60}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CUERPO = 60_000;

const responder = (cuerpo: unknown, status = 200) => Response.json(cuerpo, { status });

async function sha256(texto: string) {
  const resumen = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(resumen)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const textoCorto = (v: unknown, max: number) => (typeof v === 'string' && v.length <= max ? v : null);

Deno.serve(async req => {
  if (req.method !== 'POST') return responder({ error: 'Usa POST' }, 405);
  const crudo = await req.text();
  if (crudo.length > MAX_CUERPO) return responder({ error: 'Muy grande' }, 413);

  let correo: Record<string, unknown>;
  try { correo = JSON.parse(crudo); } catch { return responder({ error: 'JSON inválido' }, 400); }
  if (!correo || typeof correo !== 'object' || Array.isArray(correo)) return responder({ error: 'JSON inválido' }, 400);

  const clave = textoCorto(correo.clave, 60);
  const id = textoCorto(correo.id, 200);
  const remitente = textoCorto(correo.remitente, 300);
  const asunto = textoCorto(correo.asunto, 500) ?? '';
  const texto = textoCorto(correo.texto, 50_000) ?? '';
  const fecha = textoCorto(correo.fecha, 10);
  if (!clave || !CLAVE.test(clave)) return responder({ error: 'No autorizado' }, 401);
  if (!id || !remitente || !fecha || !FECHA.test(fecha)) return responder({ error: 'Faltan datos' }, 400);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: dueno, error: errorClave } = await supabase
    .from('claves_ingreso').select('user_id').eq('hash', await sha256(clave)).maybeSingle();
  if (errorClave) return responder({ error: errorClave.message }, 500);
  if (!dueno) return responder({ error: 'No autorizado' }, 401);

  const gasto = leerCorreoDeCompra({ remitente, asunto, texto, fecha });
  await supabase.from('claves_ingreso').update({ ultimo_uso: new Date().toISOString() }).eq('user_id', dueno.user_id);
  if (!gasto) return responder({ anotado: false, motivo: 'no es una compra' });

  // El mismo correo dos veces queda una sola vez (unique user_id + id_externo).
  const { error } = await supabase.from('movimientos').upsert({
    user_id: dueno.user_id,
    fecha: gasto.fecha,
    monto: gasto.monto,
    tipo: 'gasto',
    comercio: gasto.comercio,
    descripcion: null,
    origen: 'correo',
    estado: 'pendiente',
    id_externo: `gmail:${id}`,
  }, { onConflict: 'user_id,id_externo', ignoreDuplicates: true });
  if (error) return responder({ error: error.message }, 500);
  return responder({ anotado: true, lector: gasto.lector });
});
