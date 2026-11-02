// Ruta del cumpleañero: los regalos y descuentos de cumpleaños en Chile, y
// cuándo se pueden usar según tu fecha de nacimiento (perfil.fecha_nacimiento).
//
// Se revisa cada semana, junto con js/beneficios.js. Entra todo regalo que
// exista, aunque pida app, club o inscripción: la persona decide si lo usa. Lo
// que importa es decir de dónde sale el dato:
//   segun: 'web'    la página oficial de la marca lo dice (link en `fuente`).
//          'prensa' solo lo dicen guías de prensa (link a la nota en `fuente`,
//                   mes de la nota en `visto`): muchas marcas lo muestran solo
//                   dentro de su app. Si aparece en la web de la marca, pasa a 'web'.
// Al revisar: actualiza REVISADO, borra lo vencido y agrega lo nuevo.
//
// cuando: 'dia' (solo el día), 'semana' (tu día y los 7 siguientes) o
//         'mes' (todo el mes de tu cumpleaños). Si la fuente no dice el
//         plazo, va como 'dia' (lo seguro) y se avisa en `condiciones`.
// antes:  lo que hay que hacer antes para que el regalo llegue (inscribirse,
//         juntar puntos); null si basta con ir.
// llevar: lo que hay que mostrar al pedirlo; null si la fuente no lo dice.
// tipo:   'comida' | 'cine' | 'panorama' | 'tienda' (los filtros de la vista).
// donde:  'Todo Chile', las ciudades o el local.
// hasta:  último día de vigencia ('YYYY-MM-DD'); null si no se publica.
// anticipacion: (opcional) con cuántos días hay que hacer lo de `antes`, si
//         son más de 14: el aviso de Inicio llega con ese tiempo.
// noVale: (opcional) { meses: [11, 12], diasSemana: [1] } cuando el lugar
//         cierra: si tu cumpleaños cae ahí, ese regalo no aparece.
// tarjeta: (opcional) la tarjeta que pide ('cmr:premium', o solo el banco
//         'ripley'): si la tienes en Tus tarjetas, el regalo lo dice.

import { diasDelMes, sumarDias } from './util.js';
import { diaSemana } from './beneficios.js';

export const REVISADO = '2026-11-01';

// Guías de prensa usadas (2026, salvo Meganoticias de septiembre de 2025).
const CHOCALE = 'https://chocale.cl/2026/02/beneficios-en-tu-cumpleanos-en-2026-la-guia-actualizada-de-tiendas-cines-y-panoramas/';
const BIOBIO = 'https://www.biobiochile.cl/noticias/servicios/toma-nota/2026/03/28/viene-tu-cumpleanos-revisa-productos-gratis-y-descuentos-a-los-que-puedes-acceder.shtml';
const H24 = 'https://www.24horas.cl/tendencias/ocio/cumpleanos-estas-son-las-cosas-gratis-que-puedes-tener-en-tu-dia-en-2026-';
const ENCANCHA = 'https://www.encancha.cl/enlahora/servicios/2026/02/10/comida-cine-y-zoologico-6-lugares-que-te-haran-un-espectacular-regalo-solo-por-estar-de-cumpleanos/';
const FMDOS = 'https://www.fmdos.cl/noticias/estas-son-las-cosas-gratis-que-puedes-recibir-en-tu-cumpleanos-durante-el-2026/';
const MEGA = 'https://www.meganoticias.cl/dato-util/499847-cosas-gratis-dia-de-cumpleanos-panoramas-beneficios-brk-23-09-2025.html';

const SIN_PLAZO = 'La guía no dice cuántos días vale: confírmalo antes.';
const CUPON_GYN = 'La semana de tu cumpleaños, con el cupón de la app; muestra tu carnet en caja.';

export const BENEFICIOS_CUMPLE = [
  // ── Confirmados en la web de la marca ──
  { id: 'starbucks', tipo: 'comida', marca: 'Starbucks', icono: '☕', cuando: 'mes', segun: 'web',
    regalo: 'Una bebida Alta de regalo',
    condiciones: 'Una preparada en barra (no embotelladas ni jugos), una por cuenta.',
    antes: 'Inscríbete en Starbucks Rewards con tu fecha de nacimiento (después no se puede cambiar) y junta tus primeras 5 Stars: 1 por cada $1.500 que pagues con la app o la Starbucks Card.',
    llevar: 'La app o tu Starbucks Card', donde: 'Todo Chile',
    fuente: 'https://rewards.starbucks.cl/faq/rewards', hasta: null },
  { id: 'cineplanet', tipo: 'cine', marca: 'Cineplanet', icono: '🎬', cuando: 'mes', segun: 'web',
    regalo: '1 entrada 2D (2 si eres Socio Plata, Oro o Black)',
    condiciones: null,
    antes: 'Hazte Socio Cineplanet en su web o app (es gratis) y haz al menos una compra como socio.',
    llevar: 'Tu carnet', donde: 'Todo Chile',
    fuente: 'https://www.cineplanet.cl/socio-cineplanet', hasta: null },
  { id: 'cmr-premium', tipo: 'tienda', marca: 'Falabella, Tottus y Sodimac', icono: '🛍️', cuando: 'mes', segun: 'web', tarjeta: 'cmr:premium',
    regalo: 'Cupones de descuento',
    condiciones: 'Con la CMR Mastercard Premium. El banco no publica de cuánto son.',
    antes: null,
    llevar: 'Tu CMR Mastercard Premium', donde: 'Todo Chile',
    fuente: 'https://www.bancofalabella.cl/tarjetas-credito-cmr/mastercard-premium', hasta: null },

  // ── Comida ──
  { id: 'krispy-kreme', tipo: 'comida', marca: 'Krispy Kreme', icono: '🍩', cuando: 'dia', segun: 'prensa', visto: '2026-02',
    regalo: 'Una dona glaseada', condiciones: null, antes: null,
    llevar: 'Tu carnet', donde: 'Sus locales (Santiago)', fuente: CHOCALE, hasta: null },
  { id: 'little-caesars', tipo: 'comida', marca: 'Little Caesars', icono: '🍕', cuando: 'dia', segun: 'prensa', visto: '2026-02',
    regalo: 'Una porción de palitos de ajo', condiciones: null, antes: null,
    llevar: 'Tu carnet', donde: 'Sus locales', fuente: ENCANCHA, hasta: null },
  { id: 'wallys', tipo: 'comida', marca: "Wally's", icono: '🍟', cuando: 'dia', segun: 'prensa', visto: '2026-01',
    regalo: 'Una porción de papas fritas', condiciones: null, antes: null,
    llevar: 'Tu carnet', donde: 'Santiago', fuente: FMDOS, hasta: null },
  { id: 'cacao-much', tipo: 'comida', marca: 'Cacao Much', icono: '🍫', cuando: 'dia', segun: 'prensa', visto: '2026-02',
    regalo: 'Una porción de churros con salsa a elección', condiciones: null,
    antes: 'Regístrate en su página web.',
    llevar: 'Tu carnet', donde: 'Providencia (cerca del Costanera Center)', fuente: ENCANCHA, hasta: null },
  { id: 'yeongi-coffee', tipo: 'comida', marca: 'Yeongi Coffee', icono: '🧋', cuando: 'dia', segun: 'prensa', visto: '2026-02',
    regalo: 'Una bebida a elección', condiciones: SIN_PLAZO, antes: null,
    llevar: null, donde: 'Providencia', fuente: CHOCALE, hasta: null },
  { id: 'juan-valdez', tipo: 'comida', marca: 'Juan Valdez', icono: '☕', cuando: 'dia', segun: 'prensa', visto: '2026-02',
    regalo: '30% de descuento en café, bebidas, comida y productos', condiciones: SIN_PLAZO, antes: null,
    llevar: 'Tu carnet', donde: 'Sus locales', fuente: CHOCALE, hasta: null },
  { id: 'mcdonalds', tipo: 'comida', marca: "McDonald's", icono: '🍦', cuando: 'mes', segun: 'prensa', visto: '2026-02',
    regalo: 'Un Sundae Manjar', condiciones: 'Cupón en la app: se activa el día de tu cumpleaños y dura hasta fin de mes.',
    antes: 'Crea tu cuenta en la app de McDonald\'s con tu fecha de nacimiento y haz al menos una compra en la app (en los últimos 12 meses).',
    llevar: 'La app', donde: 'Todo Chile', fuente: CHOCALE, hasta: null },
  { id: 'domino', tipo: 'comida', marca: 'Dominó', icono: '🌭', cuando: 'semana', segun: 'prensa', visto: '2026-02',
    regalo: 'Un completo a elección', condiciones: 'Hasta 7 días después de tu cumpleaños.',
    antes: 'Baja la app Club Dominó, registra tu fecha de nacimiento y haz al menos una compra de dos productos.',
    llevar: 'La app', donde: 'Todo Chile', fuente: CHOCALE, hasta: null },
  { id: 'burger-king', tipo: 'comida', marca: 'Burger King', icono: '🍔', cuando: 'dia', segun: 'prensa', visto: '2025-09',
    regalo: 'Una Whopper', condiciones: SIN_PLAZO,
    antes: 'Inscríbete en Mi BK, su programa de beneficios.',
    llevar: 'La app', donde: 'Todo Chile', fuente: MEGA, hasta: null },
  { id: 'carls-jr', tipo: 'comida', marca: "Carl's Jr.", icono: '🍔', cuando: 'mes', segun: 'prensa', visto: '2026-03',
    regalo: 'Un cupón de descuento', condiciones: 'La guía no dice de cuánto. Para todos los niveles del programa.',
    antes: 'Regístrate en su app.',
    llevar: 'La app', donde: 'Todo Chile', fuente: BIOBIO, hasta: null },
  { id: 'doggis', tipo: 'comida', marca: 'Doggis', icono: '🌭', cuando: 'semana', segun: 'prensa', visto: '2026-03',
    regalo: '30% de descuento en compras sobre $6.000', condiciones: CUPON_GYN,
    antes: 'Baja la app de Doggis.', llevar: 'Tu carnet', donde: 'Todo Chile', fuente: BIOBIO, hasta: null },
  { id: 'juan-maestro', tipo: 'comida', marca: 'Juan Maestro', icono: '🥪', cuando: 'semana', segun: 'prensa', visto: '2026-03',
    regalo: '30% de descuento en compras sobre $7.000', condiciones: CUPON_GYN,
    antes: 'Baja la app de Juan Maestro.', llevar: 'Tu carnet', donde: 'Todo Chile', fuente: BIOBIO, hasta: null },
  { id: 'barrio-chicken', tipo: 'comida', marca: "Barrio Chick'en", icono: '🍗', cuando: 'semana', segun: 'prensa', visto: '2026-03',
    regalo: '30% de descuento en compras sobre $8.000', condiciones: CUPON_GYN,
    antes: "Baja la app de Barrio Chick'en.", llevar: 'Tu carnet', donde: 'Todo Chile', fuente: BIOBIO, hasta: null },
  { id: 'tommy-beans', tipo: 'comida', marca: 'Tommy Beans', icono: '🌯', cuando: 'semana', segun: 'prensa', visto: '2026-03',
    regalo: '30% de descuento en compras sobre $10.000', condiciones: CUPON_GYN,
    antes: 'Baja la app de Tommy Beans.', llevar: 'Tu carnet', donde: 'Todo Chile', fuente: BIOBIO, hasta: null },
  { id: 'mamut', tipo: 'comida', marca: 'Mamut', icono: '🍨', cuando: 'semana', segun: 'prensa', visto: '2026-03',
    regalo: '30% de descuento en compras sobre $35.000 y una copa de helado', condiciones: CUPON_GYN,
    antes: 'Baja la app de Mamut.', llevar: 'Tu carnet', donde: 'Todo Chile', fuente: BIOBIO, hasta: null },
  { id: 'jumbo-santa-isabel', tipo: 'comida', marca: 'Jumbo y Santa Isabel', icono: '🎂', cuando: 'mes', segun: 'prensa', visto: '2026-03',
    regalo: '50% de descuento en una torta de marca propia', condiciones: 'Cupón por correo.',
    antes: 'Compra dando tu RUT en caja: el cupón llega si compraste así en los últimos 12 meses.',
    llevar: 'El cupón', donde: 'Todo Chile', fuente: BIOBIO, hasta: null },

  // ── Cine ──
  { id: 'cinepolis', tipo: 'cine', marca: 'Cinépolis', icono: '🎬', cuando: 'semana', segun: 'prensa', visto: '2026-03',
    regalo: '2 entradas 2D en sala tradicional', condiciones: 'Hasta 7 días después de tu cumpleaños.',
    antes: 'Inscríbete en el Club Cinépolis al menos un día antes.',
    llevar: 'Tu carnet', donde: 'Todo Chile', fuente: BIOBIO, hasta: null },
  { id: 'cinemark', tipo: 'cine', marca: 'Cinemark', icono: '🎬', cuando: 'semana', segun: 'prensa', visto: '2026-03',
    regalo: '1 entrada 2D', condiciones: 'Hasta 7 días después de tu cumpleaños.',
    antes: 'Únete a Muvi Club y compra el Pack de Bienvenida con tiempo: una guía dice un día hábil antes y otra, un mes antes.', anticipacion: 30,
    llevar: 'Tu carnet', donde: 'Todo Chile', fuente: BIOBIO, hasta: null },

  // ── Panoramas ──
  { id: 'precolombino', tipo: 'panorama', marca: 'Museo Chileno de Arte Precolombino', icono: '🏛️', cuando: 'dia', segun: 'prensa', visto: '2026-02',
    regalo: 'Entrada gratis para ti y un acompañante', condiciones: 'Cerrado los lunes y feriados.', antes: null, noVale: { diasSemana: [1] },
    llevar: 'Tu carnet', donde: 'Santiago (Bandera 361)', fuente: CHOCALE, hasta: null },
  { id: 'sky-costanera', tipo: 'panorama', marca: 'Sky Costanera', icono: '🏙️', cuando: 'dia', segun: 'prensa', visto: '2025-09',
    regalo: 'Entradas 2x1: tú y un acompañante', condiciones: null, antes: null,
    llevar: 'Tu carnet', donde: 'Santiago (Costanera Center)', fuente: MEGA, hasta: null },
  { id: 'buin-zoo', tipo: 'panorama', marca: 'Buin Zoo', icono: '🦒', cuando: 'dia', segun: 'prensa', visto: '2026-03',
    regalo: 'Entrada gratis (con Buin Marino) y 10% en sus tiendas Makupa Market',
    condiciones: 'Desde tu cumpleaños hasta el domingo de esa semana.', antes: null,
    llevar: 'Tu carnet', donde: 'Buin (Región Metropolitana)', fuente: BIOBIO, hasta: null },
  { id: 'fantasilandia', tipo: 'panorama', marca: 'Fantasilandia', icono: '🎢', cuando: 'dia', segun: 'prensa', visto: '2026-02',
    regalo: 'Una entrada gratis', condiciones: 'Cupos limitados. El parque cierra en noviembre y diciembre.',
    antes: 'Crea tu cuenta en su web al menos 14 días antes (una guía dice un mes) y reserva: las fechas se abren el día 15 del mes anterior a tu cumpleaños.',
    anticipacion: 30, noVale: { meses: [11, 12] },
    llevar: 'Tu carnet', donde: 'Santiago (Parque O\'Higgins)', fuente: CHOCALE, hasta: null },
  { id: 'cero-grado', tipo: 'panorama', marca: 'Cero Grado', icono: '⛸️', cuando: 'dia', segun: 'prensa', visto: '2026-01',
    regalo: '1 hora de patinaje sobre hielo', condiciones: null, antes: null,
    llevar: 'Tu carnet', donde: 'Santiago, Concepción y Puerto Varas', fuente: H24, hasta: null },
  { id: 'trampoline-park', tipo: 'panorama', marca: 'Trampoline Park', icono: '🤸', cuando: 'dia', segun: 'prensa', visto: '2026-03',
    regalo: '1 hora de saltos', condiciones: null, antes: null,
    llevar: 'Tu carnet', donde: 'Santiago, Concepción, Temuco y Puerto Montt', fuente: BIOBIO, hasta: null },
  { id: 'jumpin', tipo: 'panorama', marca: 'Jumpin', icono: '🤸', cuando: 'dia', segun: 'prensa', visto: '2026-01',
    regalo: '1 hora de saltos', condiciones: null, antes: null,
    llevar: 'Tu carnet', donde: 'Sus parques', fuente: H24, hasta: null },
  { id: 'kidzania', tipo: 'panorama', marca: 'KidZania', icono: '🧒', cuando: 'dia', segun: 'prensa', visto: '2026-03',
    regalo: '5%, 10% o 15% de descuento para el niño o niña que cumple, según su pasaporte',
    condiciones: 'Otra guía (enero 2026) dice entrada gratis el día para menores de 18: confírmalo.',
    antes: 'Inscríbete en el club B•KidZanian.',
    llevar: 'Carnet o certificado de nacimiento', donde: 'Santiago', fuente: BIOBIO, hasta: null },
  { id: 'blush-bar', tipo: 'panorama', marca: 'Blush-Bar', icono: '💄', cuando: 'mes', segun: 'prensa', visto: '2026-02',
    regalo: 'Maquillaje de 20 minutos', condiciones: 'Solo el servicio, no productos.',
    antes: 'Inscríbete en su base de datos Glow, haz al menos una compra y agenda hora en tienda.',
    llevar: 'Tu carnet', donde: 'Antofagasta a Puerto Montt (11 ciudades)', fuente: CHOCALE, hasta: null },

  // ── Tiendas ──
  { id: 'adidas', tipo: 'tienda', marca: 'Adidas', icono: '👟', cuando: 'dia', segun: 'prensa', visto: '2026-01',
    regalo: '20% de descuento en una compra', condiciones: null,
    antes: 'Únete a adiClub.', llevar: 'Tu carnet', donde: 'Todo Chile', fuente: H24, hasta: null },
  { id: 'nike', tipo: 'tienda', marca: 'Nike', icono: '👟', cuando: 'dia', segun: 'prensa', visto: '2026-02',
    regalo: '20% de descuento (tope $45.000)', condiciones: SIN_PLAZO,
    antes: 'Hazte miembro de Nike.', llevar: null, donde: 'Todo Chile', fuente: CHOCALE, hasta: null },
  { id: 'americanino', tipo: 'tienda', marca: 'Americanino', icono: '👕', cuando: 'dia', segun: 'prensa', visto: '2026-02',
    regalo: '25% de descuento en ropa', condiciones: `Solo nivel AMCNO PLUS del club. ${SIN_PLAZO}`,
    antes: 'Únete al Club Americanino.', llevar: null, donde: 'Todo Chile', fuente: CHOCALE, hasta: null },
  { id: 'ripley', tipo: 'tienda', marca: 'Ripley', icono: '🛍️', cuando: 'dia', segun: 'prensa', visto: '2026-02', tarjeta: 'ripley',
    regalo: '20% a 30% en vestuario, deporte y calzado', condiciones: `Según tu categoría Ripley Puntos GO, pagando con tarjeta Ripley; tiene tope. ${SIN_PLAZO}`,
    antes: null, llevar: 'Tu tarjeta Ripley', donde: 'Todo Chile', fuente: CHOCALE, hasta: null },
  { id: 'casaideas', tipo: 'tienda', marca: 'Casaideas', icono: '🏠', cuando: 'mes', segun: 'prensa', visto: '2026-03',
    regalo: '15% de descuento', condiciones: 'Con cualquier forma de pago.',
    antes: 'Inscríbete en su Programa Cliente.', llevar: null, donde: 'Todo Chile', fuente: BIOBIO, hasta: null },
  { id: 'preunic', tipo: 'tienda', marca: 'Preunic', icono: '🧴', cuando: 'mes', segun: 'prensa', visto: '2026-01',
    regalo: '15% de descuento en la web y la app', condiciones: null,
    antes: 'Inscríbete en su plataforma.', llevar: null, donde: 'Web y app', fuente: H24, hasta: null },
  { id: 'loccitane', tipo: 'tienda', marca: "L'Occitane", icono: '🌿', cuando: 'mes', segun: 'prensa', visto: '2026-02',
    regalo: '50% de descuento en un producto', condiciones: null,
    antes: 'Inscríbete en el Club Provenzal.', llevar: null, donde: 'Todo Chile', fuente: CHOCALE, hasta: null },
  { id: 'lancome', tipo: 'tienda', marca: 'Lancôme', icono: '💄', cuando: 'mes', segun: 'prensa', visto: '2026-01',
    regalo: '20% de descuento y un cosmetiquero', condiciones: null,
    antes: 'Inscríbete como socia o socio.', llevar: 'Tu carnet', donde: 'Todo Chile', fuente: FMDOS, hasta: null },
  { id: 'la-fete', tipo: 'tienda', marca: 'La Fête', icono: '🍫', cuando: 'dia', segun: 'prensa', visto: '2026-03',
    regalo: 'Bronce: 20% en su web · Plata: bombones de 100 g · Oro: bombones de 270 g', condiciones: SIN_PLAZO,
    antes: 'Únete a Le Club.', llevar: null, donde: 'Todo Chile', fuente: BIOBIO, hasta: null },
  { id: 'liquidos', tipo: 'tienda', marca: 'Liquidos.cl', icono: '🍷', cuando: 'mes', segun: 'prensa', visto: '2026-01',
    regalo: '15% de descuento en una compra', condiciones: null,
    antes: 'Inscríbete en su web.', llevar: null, donde: 'Web', fuente: FMDOS, hasta: null },
  { id: 'lounge', tipo: 'tienda', marca: 'Lounge', icono: '👗', cuando: 'mes', segun: 'prensa', visto: '2026-01',
    regalo: '20% de descuento', condiciones: null, antes: null,
    llevar: 'Tu carnet', donde: 'Todo Chile', fuente: FMDOS, hasta: null },
  { id: 'umbrale', tipo: 'tienda', marca: 'Umbrale', icono: '🏠', cuando: 'mes', segun: 'prensa', visto: '2026-01',
    regalo: '30% de descuento', condiciones: null, antes: null,
    llevar: 'Tu carnet', donde: 'Todo Chile', fuente: FMDOS, hasta: null },
];

const AVISAR_DESDE = 14; // días antes del cumpleaños, salvo que algo pida más anticipación
const SEMANA = 7; // los regalos de la semana valen hasta 7 días después

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

// Vigente durante su ventana (para los del mes basta con que lo esté el primer
// día del mes) y con el lugar abierto ese mes y, si es solo del día, ese día.
function vigente(b, cumple) {
  if (b.hasta && b.hasta < (b.cuando === 'mes' ? cumple.slice(0, 8) + '01' : cumple)) return false;
  if (b.noVale?.meses?.includes(Number(cumple.slice(5, 7)))) return false;
  if (b.cuando === 'dia' && b.noVale?.diasSemana?.includes(diaSemana(cumple))) return false;
  return true;
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

// Los filtros de la vista.
export const TIPOS_CUMPLE = { comida: 'Comida', cine: 'Cine', panorama: 'Panoramas', tienda: 'Tiendas' };
// En el orden en que se acaban: primero lo del día, al final lo del mes.
export const CUANDO_CUMPLE = { dia: 'Tu día', semana: 'Tu semana', mes: 'Tu mes' };

// Filtra y ordena: primero lo que hay que aprovechar antes (el día, la semana,
// el mes); dentro, lo confirmado en web antes que lo visto en prensa.
const ORDEN_CUANDO = Object.fromEntries(Object.keys(CUANDO_CUMPLE).map((c, i) => [c, i]));
export function filtrarRegalos(lista, { tipo = null, cuando = null, sinInscribirse = false } = {}) {
  return lista
    .filter(b => (!tipo || b.tipo === tipo) && (!cuando || b.cuando === cuando) && (!sinInscribirse || !b.antes))
    .sort((a, b) => ORDEN_CUANDO[a.cuando] - ORDEN_CUANDO[b.cuando]
      || (a.segun === 'web' ? 0 : 1) - (b.segun === 'web' ? 0 : 1)
      || a.marca.localeCompare(b.marca, 'es'));
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
  const desde = Math.max(AVISAR_DESDE, ...ruta.antes.map(b => b.anticipacion ?? 0));
  if (dias > 0) return dias <= desde ? { tipo: 'pronto', dias, cuantos: regalos.length, antes: ruta.antes.length } : null;
  const { elegidos, usados } = rutaDelAnio(guardada, Number(ruta.cumple.slice(0, 4)));
  const quedan = regalos.filter(b => elegidos.includes(b.id) && !usados.includes(b.id)).length;
  return quedan ? { tipo: 'mes', dias, cuantos: quedan, antes: 0 } : null;
}
