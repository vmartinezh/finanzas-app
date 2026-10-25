// Recibe lo que llega solo y lo deja "por revisar":
// - fuente 'correo': un aviso del banco (compra o transferencia) que el script
//   de Google de la persona encontró en su Gmail (correo/simplifika.gs).
// - fuente 'wallet': un pago con Apple Pay que manda el Atajo del iPhone
//   ("Cuando pago con Wallet"), con el comercio y el monto.
// No guarda el correo: solo monto, comercio y fecha.
//
// La clave de ingreso identifica a la persona y la fuente (en la base está solo
// su hash). Con ella solo se pueden agregar movimientos por revisar, no leer nada.
//
// Publicar con "Verify JWT" desactivado (la función revisa su propia clave).
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los pone Supabase.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { leerCorreoDeCompra, leerPagoWallet } from './lectores.js';

const CLAVE = /^[A-Za-z0-9_-]{40,60}$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CUERPO = 60_000;

const responder = (cuerpo: unknown, status = 200) => Response.json(cuerpo, { status });

async function sha256(texto: string) {
  const resumen = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(resumen)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const textoCorto = (v: unknown, max: number) => (typeof v === 'string' && v.length <= max ? v : null);

// El día y la hora en Chile ('2026-10-25 14:03'): el Atajo avisa en el momento
// del pago, así que es la fecha del gasto.
const ahoraEnChile = () => new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).slice(0, 16);

type Movimiento = { tipo: string; monto: number; comercio: string | null; fecha: string; lector: string };

// Del cuerpo recibido saca el movimiento y su id externo (para no anotarlo dos
// veces), o un error si faltan datos.
function leer(fuente: string, cuerpo: Record<string, unknown>): { movimiento: Movimiento | null; idExterno: string | null } | { error: string } {
  if (fuente === 'wallet') {
    // Si el monto llega como número, solo vale un entero (el peso no tiene centavos).
    const monto = typeof cuerpo.monto === 'number'
      ? (Number.isSafeInteger(cuerpo.monto) ? String(cuerpo.monto) : '')
      : textoCorto(cuerpo.monto, 40);
    if (monto === null) return { error: 'Faltan datos' };
    const ahora = ahoraEnChile();
    const movimiento = leerPagoWallet({ comercio: typeof cuerpo.comercio === 'string' ? cuerpo.comercio.slice(0, 200) : '', monto, fecha: ahora.slice(0, 10) });
    // iOS a veces corre la automatización dos veces por un pago: el mismo monto
    // en el mismo comercio y el mismo minuto se anota una vez.
    return { movimiento, idExterno: movimiento ? `wallet:${ahora}:${movimiento.monto}:${movimiento.comercio ?? ''}`.slice(0, 200) : null };
  }
  const id = textoCorto(cuerpo.id, 200);
  const remitente = textoCorto(cuerpo.remitente, 300);
  const asunto = textoCorto(cuerpo.asunto, 500) ?? '';
  const texto = textoCorto(cuerpo.texto, 50_000) ?? '';
  const fecha = textoCorto(cuerpo.fecha, 10);
  if (!id || !remitente || !fecha || !FECHA.test(fecha)) return { error: 'Faltan datos' };
  return { movimiento: leerCorreoDeCompra({ remitente, asunto, texto, fecha }), idExterno: `gmail:${id}` };
}

Deno.serve(async req => {
  if (req.method !== 'POST') return responder({ error: 'Usa POST' }, 405);
  const crudo = await req.text();
  if (crudo.length > MAX_CUERPO) return responder({ error: 'Muy grande' }, 413);

  let cuerpo: Record<string, unknown>;
  try { cuerpo = JSON.parse(crudo); } catch { return responder({ error: 'JSON inválido' }, 400); }
  if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) return responder({ error: 'JSON inválido' }, 400);

  const clave = textoCorto(cuerpo.clave, 60);
  if (!clave || !CLAVE.test(clave)) return responder({ error: 'No autorizado' }, 401);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const { data: dueno, error: errorClave } = await supabase
    .from('claves_ingreso').select('user_id, fuente').eq('hash', await sha256(clave)).maybeSingle();
  if (errorClave) return responder({ error: errorClave.message }, 500);
  if (!dueno) return responder({ error: 'No autorizado' }, 401);

  const leido = leer(dueno.fuente, cuerpo);
  if ('error' in leido) return responder({ error: leido.error }, 400);
  const { movimiento, idExterno } = leido;
  await supabase.from('claves_ingreso').update({ ultimo_uso: new Date().toISOString() })
    .eq('user_id', dueno.user_id).eq('fuente', dueno.fuente);
  if (!movimiento) return responder({ anotado: false, motivo: 'no es una compra ni una transferencia en pesos' });

  const fila = {
    user_id: dueno.user_id,
    fecha: movimiento.fecha,
    monto: movimiento.monto,
    tipo: movimiento.tipo,
    comercio: movimiento.comercio,
    descripcion: null,
    origen: dueno.fuente,
    estado: 'pendiente',
    id_externo: idExterno,
  };
  // El mismo aviso dos veces queda una sola vez (unique user_id + id_externo).
  const { error } = await supabase.from('movimientos').upsert(fila, { onConflict: 'user_id,id_externo', ignoreDuplicates: true });
  if (error) return responder({ error: error.message }, 500);
  return responder({ anotado: true, lector: movimiento.lector });
});
