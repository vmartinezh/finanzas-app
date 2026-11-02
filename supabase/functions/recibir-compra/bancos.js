// Bancos y tarjetas: reconocer de qué banco habla un texto y con cuál de tus
// tarjetas se pagó una compra.
//
// Lo usan la Edge Function recibir-compra (index.ts) y la app (js/beneficios.js,
// para unir una deuda con su tarjeta), para que el servidor y la app reconozcan
// igual. Los ids son los del catálogo de la app (TARJETAS en js/beneficios.js):
// si agregas un banco allá, agrégalo aquí. JavaScript puro.

import { comoNombre } from './cuentas.js';

// Cómo se nombra cada banco en un texto: una deuda ("Tarjeta Falabella", "Bco.
// Chile") o el nombre de la tarjeta en Wallet. Lider Bci va antes que Bci:
// "Lider Bci" no es una tarjeta Bci.
const NOMBRES_BANCO = [
  ['lider-bci', /\blider\b/],
  ['cmr', /\b(cmr|falabella)\b/],
  ['santander', /\bsantander\b/],
  ['banco-de-chile', /\b(banco de chile|bco\.? chile|bancochile|edwards)\b/],
  ['bancoestado', /\b(banco ?estado|cuenta ?rut)\b/],
  ['scotiabank', /\bscotia/],
  ['cencosud', /\b(cencosud|jumbo|paris)\b/],
  ['ripley', /\bripley\b/],
  ['itau', /\bitau\b/],
  ['bci', /\bbci\b/],
];

// En el dominio de un correo los nombres van pegados ("cmrfalabella.com",
// "bancoripley.cl", "tarjetacencosud.cl"): se buscan dentro, sin bordes.
const DOMINIOS_BANCO = [
  ['lider-bci', /lider/],
  ['cmr', /cmr|falabella/],
  ['santander', /santander/],
  ['banco-de-chile', /bancochile|bancoedwards|edwards/],
  ['bancoestado', /bancoestado/],
  ['scotiabank', /scotia/],
  ['cencosud', /cencosud/],
  ['ripley', /ripley/],
  ['itau', /itau/],
  ['bci', /bci/],
];

// El id del banco que nombra el texto, o null.
export function bancoPorNombre(texto) {
  const t = comoNombre(texto);
  return NOMBRES_BANCO.find(([, patron]) => patron.test(t))?.[0] ?? null;
}

// El id del banco que manda un correo, por su dominio ("avisos@bancoripley.cl"), o null.
export function bancoPorRemitente(remitente) {
  const dominio = String(remitente ?? '').match(/@([^\s<>]+)/)?.[1]?.toLowerCase() ?? '';
  return DOMINIOS_BANCO.find(([, patron]) => patron.test(dominio))?.[0] ?? null;
}

// Los 4 dígitos al final del nombre de una tarjeta en Wallet, solo si vienen
// enmascarados ("CMR •••• 1234", "Visa *1234"): un nombre que termina en un
// número ("Santander 2024") no dice los dígitos.
export const digitosDelNombre = nombre => String(nombre ?? '').match(/(?:[•*·]+|\.{2,}|\b[xX]{2,})\s?(\d{4})\s*$/)?.[1] ?? null;

// La tarjeta de la persona con la que se hizo una compra, o null si no se sabe
// (mejor sin tarjeta que con la equivocada: se puede elegir al revisarla).
// tarjetas: las activas, [{ id, institucion, terminacion }].
// digitos: los 4 del aviso ("terminada en 1234"), si los trae.
// banco: el id del banco, si se sabe (del remitente o del nombre en Wallet).
// Primero por los dígitos (si dos tarjetas los comparten, decide el banco; si
// ninguna los tiene, puede ser la única de ese banco anotada sin dígitos); sin
// dígitos, por el banco, solo si tienes una sola tarjeta de ese banco.
export function tarjetaDeCompra(tarjetas, { digitos = null, banco = null } = {}) {
  const unica = lista => (lista.length === 1 ? lista[0].id : null);
  const delBanco = lista => (banco ? lista.filter(c => c.institucion === banco) : []);
  if (/^\d{4}$/.test(digitos ?? '')) {
    const conDigitos = tarjetas.filter(c => c.terminacion === digitos);
    if (conDigitos.length) return unica(conDigitos) ?? unica(delBanco(conDigitos));
    // Nadie tiene esos dígitos: puede ser una del banco que anotaste sin ellos.
    return unica(delBanco(tarjetas.filter(c => !c.terminacion)));
  }
  return unica(delBanco(tarjetas));
}
