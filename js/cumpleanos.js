// Ruta del cumpleañero: los regalos y descuentos de cumpleaños en Chile, y
// cuándo se pueden usar según tu fecha de nacimiento (perfil.fecha_nacimiento).
//
// Se revisa a mano cada semana, junto con js/beneficios.js. Solo entra lo que
// dice la página oficial de cada marca (link en `fuente`): las guías de prensa
// sirven para saber dónde buscar, no como fuente. Al revisar: actualiza
// REVISADO, borra lo vencido y agrega lo nuevo.
//
// cuando: 'dia' (solo el día), 'semana' (los 7 días desde tu cumpleaños) o
//         'mes' (todo el mes de tu cumpleaños).
// antes:  lo que hay que hacer antes para que el regalo llegue (inscribirse,
//         juntar puntos); null si basta con ir.
// llevar: lo que hay que mostrar al pedirlo; null si la marca no lo dice.
// donde:  'Todo Chile' o la ciudad.
// hasta:  último día de vigencia ('YYYY-MM-DD'); null si la marca no la publica.

import { diasDelMes, sumarDias } from './util.js';

export const REVISADO = '2026-11-01';

export const BENEFICIOS_CUMPLE = [
  {
    id: 'starbucks', marca: 'Starbucks', icono: '☕', cuando: 'mes',
    regalo: 'Una bebida Alta de regalo',
    condiciones: 'Una preparada en barra (no embotelladas ni jugos), una por cuenta.',
    antes: 'Inscríbete en Starbucks Rewards con tu fecha de nacimiento (después no se puede cambiar) y junta tus primeras 5 Stars: 1 por cada $1.500 que pagues con la app o la Starbucks Card.',
    llevar: 'La app o tu Starbucks Card',
    donde: 'Todo Chile',
    fuente: 'https://rewards.starbucks.cl/faq/rewards', hasta: null,
  },
  {
    id: 'cineplanet', marca: 'Cineplanet', icono: '🎬', cuando: 'mes',
    regalo: '1 entrada 2D (2 si eres Socio Plata, Oro o Black)',
    condiciones: null,
    antes: 'Hazte Socio Cineplanet en su web o app. Es gratis.',
    llevar: null,
    donde: 'Todo Chile',
    fuente: 'https://www.cineplanet.cl/socio-cineplanet', hasta: null,
  },
  {
    id: 'cmr-premium', marca: 'Falabella, Tottus y Sodimac', icono: '🛍️', cuando: 'mes',
    regalo: 'Cupones de descuento',
    condiciones: 'Con la CMR Mastercard Premium. El banco no publica de cuánto son.',
    antes: null,
    llevar: 'Tu CMR Mastercard Premium',
    donde: 'Todo Chile',
    fuente: 'https://www.bancofalabella.cl/tarjetas-credito-cmr/mastercard-premium', hasta: null,
  },
];

const AVISAR_DESDE = 14; // días antes del cumpleaños
const SEMANA = 6; // los regalos de la semana valen hasta 6 días después

const iso = (a, m, d) => `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const esBisiesto = a => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
const diasEntre = (desde, hasta) => Math.round((Date.parse(hasta + 'T00:00:00Z') - Date.parse(desde + 'T00:00:00Z')) / 864e5);
const finDelMes = fecha => `${fecha.slice(0, 7)}-${diasDelMes(fecha.slice(0, 7))}`;
// Hasta cuándo vale algo de ese cumpleaños: lo que termine después, su mes o su semana.
const ultimoDia = cumple => [finDelMes(cumple), sumarDias(cumple, SEMANA)].sort().at(-1);

// Tu cumpleaños en un año dado: quien nació un 29 de febrero lo celebra el 28
// los años que no son bisiestos.
function cumpleDelAnio(nacimiento, anio) {
  const [, m, d] = nacimiento.split('-').map(Number);
  return m === 2 && d === 29 && !esBisiesto(anio) ? iso(anio, 2, 28) : iso(anio, m, d);
}

// El cumpleaños que importa hoy: mientras quede algo por usar de uno (su mes
// o su semana, lo que termine después), ese; si no, el que viene. La semana de
// un cumpleaños de fin de diciembre sigue en enero.
export function cumpleQueViene(nacimiento, hoy) {
  const anio = Number(hoy.slice(0, 4));
  const anterior = cumpleDelAnio(nacimiento, anio - 1);
  if (hoy <= ultimoDia(anterior)) return anterior;
  const este = cumpleDelAnio(nacimiento, anio);
  return hoy <= ultimoDia(este) ? este : cumpleDelAnio(nacimiento, anio + 1);
}

// Vigente durante su ventana: para los del mes basta con que lo esté el primer día del mes.
function vigente(b, cumple) {
  if (!b.hasta) return true;
  return b.hasta >= (b.cuando === 'mes' ? cumple.slice(0, 8) + '01' : cumple);
}

// La ruta de tu próximo cumpleaños: { cumple, dias, antes, dia, semana, mes },
// solo con lo que todavía se puede usar (pasado tu día, lo del día ya no está).
// dias: cuántos faltan (0 = hoy; negativo = ya pasó, pero sigue tu mes o tu semana).
// null si no hay fecha de nacimiento.
export function rutaDelCumple(nacimiento, hoy, catalogo = BENEFICIOS_CUMPLE) {
  if (!nacimiento) return null;
  const cumple = cumpleQueViene(nacimiento, hoy);
  const dias = diasEntre(hoy, cumple);
  const lista = catalogo.filter(b => vigente(b, cumple));
  const de = cuando => lista.filter(b => b.cuando === cuando);
  return {
    cumple,
    dias,
    antes: dias > 0 ? lista.filter(b => b.antes) : [],
    dia: dias >= 0 ? de('dia') : [],
    semana: dias >= -SEMANA ? de('semana') : [],
    mes: hoy <= finDelMes(cumple) ? de('mes') : [],
  };
}

// Los regalos que todavía se pueden usar, una vez cada uno.
export const regalosDe = ruta => [...new Map([...ruta.dia, ...ruta.semana, ...ruta.mes].map(b => [b.id, b])).values()];

// Lo que se marcó en la ruta es de un año: el año siguiente parte de cero.
export function rutaDelAnio(guardada, anio) {
  return guardada?.anio === anio ? guardada : { anio, elegidos: [], usados: [] };
}

// El aviso de Inicio, o null:
//   'pronto': faltan 1 a 14 días (cuantos = regalos; antes = cuántos piden inscribirse antes)
//   'hoy':    es tu cumpleaños
//   'mes':    ya pasó, pero te quedan regalos elegidos sin usar que todavía valen (cuantos)
export function avisoCumple(nacimiento, hoy, guardada, catalogo = BENEFICIOS_CUMPLE) {
  const ruta = rutaDelCumple(nacimiento, hoy, catalogo);
  if (!ruta) return null;
  const regalos = regalosDe(ruta);
  if (!regalos.length) return null;
  const { dias } = ruta;
  if (dias === 0) return { tipo: 'hoy', dias, cuantos: regalos.length, antes: 0 };
  if (dias > 0) return dias <= AVISAR_DESDE ? { tipo: 'pronto', dias, cuantos: regalos.length, antes: ruta.antes.length } : null;
  const { elegidos, usados } = rutaDelAnio(guardada, Number(ruta.cumple.slice(0, 4)));
  const quedan = regalos.filter(b => elegidos.includes(b.id) && !usados.includes(b.id)).length;
  return quedan ? { tipo: 'mes', dias, cuantos: quedan, antes: 0 } : null;
}
