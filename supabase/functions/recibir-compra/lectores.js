// Lectores de los correos de compra de los bancos: del remitente, el asunto y el
// texto de un correo sacan el gasto { monto, comercio, fecha, tarjeta }, o null
// si el correo no es una compra.
//
// Lo usa la Edge Function recibir-compra (Deno) y lo prueban tests/index.html
// en el navegador: JavaScript puro, sin importar nada.
//
// Por ahora hay un lector general (monto, comercio y tarjeta con las frases más
// comunes). Cada banco con un formato propio suma su lector en LECTORES, con
// pruebas hechas con correos inventados en su formato, nunca con datos reales.

// Bancos y casas comerciales que mandan avisos de compra. El script de Google
// solo busca correos de estos dominios (correo/simplifika.gs) y la función
// descarta los demás. Provisorio: se afina con los correos reales de cada banco.
export const DOMINIOS_BANCOS = [
  'santander.cl', 'bancochile.cl', 'bci.cl', 'bancoestado.cl', 'scotiabank.cl',
  'itau.cl', 'bancofalabella.cl', 'cmrfalabella.com', 'bancoripley.cl',
  'tarjetacencosud.cl', 'lider.cl', 'bancosecurity.cl', 'bice.cl', 'tenpo.cl',
  'mercadopago.cl', 'machbank.com',
];

// Lectores por banco: { nombre, dominio: /regex del remitente/, leer(correo) → gasto | null }.
const LECTORES = [];

// Un aviso de compra dice que la compra ocurrió; la publicidad ("tu próxima
// compra en cuotas desde $10.000") no.
const ES_COMPRA = /compra (?:por|de|realizada|aprobada|efectuada)|realizaste una compra|se (?:ha )?realiz[oó]|cargo (?:por|de)|transacci[oó]n|usaste tu tarjeta|uso de (?:tu|su) tarjeta|pago con (?:tu|su) tarjeta|\bmonto\s*:/i;
const NO_ES_GASTO = /rechazad|no (?:fue|ha sido) (?:aprobad|autorizad)|reversa|anulad|devoluci[oó]n|abono|reembolso/i;
// La publicidad se reconoce por el asunto: los avisos de compra reales suelen
// traer ofertas al pie, y por eso no se mira el cuerpo.
const PUBLICIDAD = /sin inter[eé]s|desde \$|promoci[oó]n|oferta|aprovecha|cyber|black friday|descuento/i;
// Por ahora solo pesos: una compra en dólares no se anota con un monto equivocado.
const OTRA_MONEDA = /US\$|U\$S|\bUSD\b|\bEUR\b|€/i;

export function dominioDe(remitente) {
  const correo = String(remitente ?? '').match(/[^\s<>@]+@([^\s<>]+)/);
  return correo ? correo[1].toLowerCase().replace(/>$/, '') : '';
}

export const esDeBanco = remitente => {
  const dominio = dominioDe(remitente);
  return DOMINIOS_BANCOS.some(d => dominio === d || dominio.endsWith('.' + d));
};

// "$12.990" → 12990 · "$ 1.500.000" → 1500000 · "$12.990,50" → 12991
function montoDe(texto) {
  const m = texto.match(/(?<![A-Za-z])\$\s?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/);
  if (!m) return null;
  const monto = Math.round(Number(m[1].replace(/\./g, '') + (m[2] ? '.' + m[2] : '')));
  return monto > 0 ? monto : null;
}

function comercioDe(texto) {
  const etiqueta = texto.match(/\bcomercio\s*:\s*([^\n|]{2,80}?)\s*(?:\n|\||$|\s{2,}|\b(?:fecha|monto|hora|tarjeta)\b)/i);
  const enFrase = texto.match(/\ben\s+([A-Z0-9][A-Z0-9 *.&'\-_/]{1,60}?)(?=\s+(?:el|con|a las|por|del|día)\b|[,.;\n]|\s+\d{1,2}[/-]|$)/);
  const comercio = (etiqueta?.[1] ?? enFrase?.[1] ?? '').trim().replace(/\s+/g, ' ');
  return comercio.length >= 2 ? comercio.slice(0, 80) : null;
}

const tarjetaDe = texto => texto.match(/(?:terminad[ao] en|terminaci[oó]n|[*xX]{4}[\s-]?)\s*(\d{4})\b/i)?.[1] ?? null;

function lectorGeneral({ asunto, texto }) {
  const todo = `${asunto}\n${texto}`;
  if (!ES_COMPRA.test(todo) || NO_ES_GASTO.test(todo) || PUBLICIDAD.test(asunto) || OTRA_MONEDA.test(todo)) return null;
  const monto = montoDe(todo);
  if (!monto) return null;
  return { monto, comercio: comercioDe(texto) ?? comercioDe(asunto), tarjeta: tarjetaDe(todo) };
}

// fecha: 'AAAA-MM-DD' del día en que llegó el correo (en hora de Chile).
export function leerCorreoDeCompra({ remitente = '', asunto = '', texto = '', fecha = '' } = {}) {
  if (!esDeBanco(remitente) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const correo = { remitente, asunto: String(asunto).slice(0, 300), texto: String(texto).replace(/\r/g, '').slice(0, 20000) };
  const lector = LECTORES.find(l => l.dominio.test(dominioDe(remitente)));
  const delBanco = lector?.leer(correo) ?? null;
  const gasto = delBanco ?? lectorGeneral(correo);
  return gasto ? { ...gasto, fecha, lector: delBanco ? lector.nombre : 'general' } : null;
}
