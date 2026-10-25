// Lectores de los avisos de los bancos: del remitente, el asunto y el texto de
// un correo sacan el movimiento { tipo, monto, comercio, fecha, tarjeta }, o
// null si el correo no es una compra ni una transferencia.
//
// Lo usa la Edge Function recibir-compra (Deno) y lo prueban tests/index.html
// en el navegador: JavaScript puro, sin importar nada.
//
// Hay un lector general de compras (monto, comercio y tarjeta con las frases más
// comunes) y lectores por banco para las transferencias. Cada banco con un
// formato propio suma su lector en LECTORES, con pruebas hechas con correos
// inventados en su formato, nunca con datos reales.

// Bancos y casas comerciales que mandan avisos de compra. El script de Google
// solo busca correos de estos dominios (correo/simplifika.gs) y la función
// descarta los demás. Provisorio: se afina con los correos reales de cada banco.
export const DOMINIOS_BANCOS = [
  'santander.cl', 'bancochile.cl', 'bci.cl', 'bancoestado.cl', 'scotiabank.cl',
  'itau.cl', 'bancofalabella.cl', 'cmrfalabella.com', 'bancoripley.cl',
  'tarjetacencosud.cl', 'lider.cl', 'bancosecurity.cl', 'bice.cl', 'tenpo.cl',
  'mercadopago.cl', 'machbank.com',
];

// Los correos que vienen solo en HTML llegan con una palabra por línea
// ("Ya / enviamos / tu / transferencia"): los lectores por banco leen el
// texto en una sola línea.
const enUnaLinea = texto => texto.replace(/\s+/g, ' ').trim();

// "$ 20.000" o "$20.000" justo después de una etiqueta ("Monto transferido").
const montoTras = (texto, etiqueta) =>
  montoDe(texto.match(new RegExp(String.raw`${etiqueta.source}\s*:?\s*(\$\s?[\d.,]+)`, 'i'))?.[1] ?? '');

// El nombre que viene después de una etiqueta y antes de la siguiente.
const nombreEntre = (texto, desde, hasta) =>
  texto.match(new RegExp(String.raw`${desde.source}\s*:?\s*(.{2,80}?)\s+(?:${hasta.source})`, 'i'))?.[1].trim() ?? null;

// "VICENTE PÉREZ SOTO" y "Vicente Perez Soto" son la misma persona.
const comoNombre = n => String(n ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// "RUT 11.111.111-1" → "11111111-1"
const rutDe = texto => texto.match(/\brut\s*:?\s*([\d.]{7,12}-[\dkK])/i)?.[1].replace(/\./g, '').toUpperCase() ?? null;

// El comercio de una transferencia es la otra persona: así la app aprende que
// lo que le pasas a tu mamá es "Familia".
const transferencia = (tipo, persona, monto) => monto && persona
  ? { tipo, monto, comercio: `Transferencia ${tipo === 'gasto' ? 'a' : 'de'} ${persona}`.slice(0, 80), tarjeta: null }
  : null;

// Lectores por banco: { nombre, dominio: /regex del dominio/, leer(correo) → movimiento | null }.
// Un lector que devuelve NO_ANOTAR reconoció el correo y decidió que no va
// (así no lo intenta el lector general): por ejemplo, una transferencia a tu
// propio nombre, que es plata que mueves entre tus cuentas y no un gasto.
const NO_ANOTAR = 'no anotar';
const LECTORES = [
  {
    // Comprobante de una transferencia que hiciste desde Santander.
    nombre: 'santander-transferencia',
    dominio: /(^|\.)santander\.cl$/,
    leer({ asunto, texto }) {
      if (!/transferencia de fondos/i.test(asunto)) return null;
      const t = enUnaLinea(texto);
      if (!/monto transferido/i.test(t)) return null;
      const [deOrigen, deDestino = ''] = t.split(/datos de destino/i);
      const origen = nombreEntre(deOrigen, /datos de origen.*?\bnombre/, /comentario|$/);
      const destino = nombreEntre(t, /datos de destino.*?\bnombre/, /\brut\b|\bbanco\b/);
      const mismoRut = rutDe(deOrigen) && rutDe(deOrigen) === rutDe(deDestino);
      if (mismoRut || (origen && destino && comoNombre(origen) === comoNombre(destino))) return NO_ANOTAR;
      return transferencia('gasto', destino, montoTras(t, /monto transferido/));
    },
  },
  {
    // Aviso de una transferencia que enviaste desde Mercado Pago.
    nombre: 'mercadopago-transferencia',
    dominio: /(^|\.)mercadopago\.cl$/,
    leer({ asunto, texto }) {
      const t = enUnaLinea(texto);
      if (!/enviamos tu transferencia/i.test(`${asunto} ${t}`)) return null;
      const destino = nombreEntre(t, /nombre y apellido/, /entidad\b|\bbanco\b|n[uú]mero de cuenta|\brut\b/);
      return transferencia('gasto', destino, montoTras(t, /enviamos tu transferencia de/));
    },
  },
  {
    // Aviso de Banco de Chile de que alguien te transfirió a tu cuenta (de
    // cualquier banco: lo manda el banco de quien te paga).
    nombre: 'bancochile-transferencia-recibida',
    dominio: /(^|\.)bancochile\.cl$/,
    leer({ texto }) {
      const t = enUnaLinea(texto);
      if (!/ha efectuado una transferencia de fondos a tu cuenta/i.test(t)) return null;
      const quien = t.match(/cliente\s+(.{2,80}?)\s+ha efectuado/i)?.[1];
      return transferencia('ingreso', quien, montoTras(t, /\bmonto\b/));
    },
  },
];

// Un aviso de compra dice que la compra ocurrió; la publicidad ("tu próxima
// compra en cuotas desde $10.000") no.
const ES_COMPRA = /compra (?:por|de|realizada|aprobada|efectuada)|realizaste una compra|se (?:ha )?realiz[oó]|cargo (?:por|de)|transacci[oó]n|usaste tu tarjeta|uso de (?:tu|su) tarjeta|pago con (?:tu|su) tarjeta|\bmonto\s*:/i;
const NO_ES_GASTO = /rechazad|no (?:fue|ha sido) (?:aprobad|autorizad)|reversa|anulad|devoluci[oó]n|abono|reembolso/i;
// La publicidad se reconoce por el asunto: los avisos de compra reales suelen
// traer ofertas al pie, y por eso no se mira el cuerpo.
const PUBLICIDAD = /sin inter[eé]s|desde \$|promoci[oó]n|oferta|aprovecha|cyber|black friday|descuento/i;
// Por ahora solo pesos: una compra en dólares no se anota con un monto equivocado.
const OTRA_MONEDA = /US\$|U\$S|\bUSD\b|\bEUR\b|€/i;
// El lector general solo lee compras: la transferencia de un banco sin lector
// propio no se anota como compra.
const TRANSFERENCIA = /\btransferencia\b|\btransferiste\b/i;

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
  if (!ES_COMPRA.test(todo) || NO_ES_GASTO.test(todo) || PUBLICIDAD.test(asunto) || OTRA_MONEDA.test(todo) || TRANSFERENCIA.test(todo)) return null;
  const monto = montoDe(todo);
  if (!monto) return null;
  return { tipo: 'gasto', monto, comercio: comercioDe(texto) ?? comercioDe(asunto), tarjeta: tarjetaDe(todo) };
}

// fecha: 'AAAA-MM-DD' del día en que llegó el correo (en hora de Chile).
export function leerCorreoDeCompra({ remitente = '', asunto = '', texto = '', fecha = '' } = {}) {
  if (!esDeBanco(remitente) || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const correo = { remitente, asunto: String(asunto).slice(0, 300), texto: String(texto).replace(/\r/g, '').slice(0, 20000) };
  const lector = LECTORES.find(l => l.dominio.test(dominioDe(remitente)));
  const delBanco = lector?.leer(correo) ?? null;
  if (delBanco === NO_ANOTAR) return null;
  const movimiento = delBanco ?? lectorGeneral(correo);
  return movimiento ? { ...movimiento, fecha, lector: delBanco ? lector.nombre : 'general' } : null;
}
