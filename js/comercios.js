// Dónde gastas: reconocer que "JUMBO LAS CONDES", "Jumbo" y "MERPAGO*JUMBO"
// son el mismo lugar.
//
// Cada comercio es una fila de la tabla comercios con su nombre, su categoría
// y sus "patrones": las claves (claveComercio) de las formas en que lo escribe
// el banco. Un gasto lo apunta con movimientos.comercio_id; el texto original
// se queda en movimientos.comercio.
//
// Aquí solo va lo que no toca los datos (se usa también al importar un
// respaldo, en js/validar.js). Lo que lee y guarda está en js/mis-comercios.js.
import { normalizar } from './util.js';

// Lo que antecede al comercio cuando pagas con un intermediario: "MERPAGO*JUMBO".
const PROCESADORES = /^(?:merpago|mercadopago|mercado pago|mp|payu|sumup|dlo|dlocal|paypal|pp|sq|getnet|flow|khipu|tuu|klap|haulmer|izi|zettle|google)\s*\*\s*/;

// Minúsculas, sin tildes, sin apóstrofes y con los demás signos como espacio:
// "McDonald’s" → "mcdonalds", "H&M" → "h m".
function sinSignos(texto) {
  return normalizar(texto).replace(/[’'`´]/g, '').replace(/[^a-z0-9ñ]+/g, ' ').trim();
}

// Palabras que no distinguen un comercio de otro: formas legales y sucursal.
const RUIDO = new Set(['spa', 'ltda', 'limitada', 'eirl', 'sucursal', 'suc', 'local']);

// Solas no dicen qué lugar es ("MERCADOPAGO*TIENDA"): sin comercio.
const GENERICAS = new Set(['tienda', 'comercio', 'compra', 'compras', 'pago', 'pagos', 'servicio', 'servicios', 'cafe', 'bar',
  'restaurant', 'restaurante', 'almacen', 'minimarket', 'botilleria', 'farmacia', 'supermercado', 'kiosco', 'web', 'online']);

// Movimientos del banco, no compras en un comercio: "PAGO CMR FALABELLA",
// "BANCO RIPLEY", "TRASPASO A CTA", "COMISION MANTENCION".
const DEL_BANCO = /^(pago|pagos|abono|banco|bco|traspaso|giro|cargo|comision|intereses|impuesto|transferencia)\b/;

// Al final del nombre: la forma legal y dónde queda ("STARBUCKS CHILE",
// "SANTA BRASA VITACURA"). Solo si después queda algo.
const AL_FINAL = [
  's a', 'sa', 'chile', 'cl',
  'santiago', 'las condes', 'providencia', 'vitacura', 'nunoa', 'la reina', 'lo barnechea', 'maipu',
  'la florida', 'puente alto', 'estacion central', 'independencia', 'recoleta', 'san miguel', 'macul',
  'penalolen', 'huechuraba', 'quilicura', 'colina', 'chicureo', 'vina del mar', 'valparaiso',
  'concepcion', 'temuco', 'antofagasta', 'la serena', 'rancagua', 'talca', 'puerto montt',
];

// Marcas que el banco escribe de varias formas. Cada una se reconoce si el
// texto empieza con alguna de sus formas, o si la contiene y es larga (6 o más
// letras): "cafe paris" no es la tienda Paris. El nombre es como se muestra.
const MARCAS = [
  ['Lider', ['lider', 'express de lider', 'hiper lider', 'lider express']],
  ['Jumbo', ['jumbo']],
  ['Unimarc', ['unimarc']],
  ['Tottus', ['tottus']],
  ['Santa Isabel', ['santa isabel']],
  ['aCuenta', ['acuenta', 'superbodega acuenta']],
  ['Starbucks', ['starbucks']],
  ['McDonald’s', ['mcdonalds', 'mc donalds', 'mcdonald']],
  ['Burger King', ['burger king']],
  ['KFC', ['kfc']],
  ['Dunkin’', ['dunkin']],
  ['Domino’s Pizza', ['dominos pizza', 'dominos']],
  ['Rappi', ['rappi']],
  ['PedidosYa', ['pedidosya', 'pedidos ya']],
  ['Uber Eats', ['uber eats', 'ubereats']],
  ['Uber', ['uber']],
  ['Cabify', ['cabify']],
  ['DiDi', ['didi']],
  ['Copec', ['copec']],
  ['Shell', ['shell']],
  ['Petrobras', ['petrobras']],
  ['Aramco', ['aramco']],
  ['Enel', ['enel']],
  ['Aguas Andinas', ['aguas andinas']],
  ['Metrogas', ['metrogas']],
  ['Abastible', ['abastible']],
  ['Lipigas', ['lipigas']],
  ['Gasco', ['gasco']],
  ['Sodimac', ['sodimac', 'homecenter']],
  ['Easy', ['easy']],
  ['IKEA', ['ikea']],
  ['Cruz Verde', ['cruz verde', 'farmacias cruz verde']],
  ['Salcobrand', ['salcobrand']],
  ['Farmacias Ahumada', ['farmacias ahumada', 'ahumada']],
  ['Cinemark', ['cinemark']],
  ['Cineplanet', ['cineplanet']],
  ['Netflix', ['netflix']],
  ['Spotify', ['spotify']],
  ['Disney+', ['disney plus', 'disneyplus', 'disney']],
  ['YouTube', ['youtube']],
  ['Apple', ['apple com bill', 'apple']],
  ['Entel', ['entel']],
  ['Movistar', ['movistar']],
  ['WOM', ['wom']],
  ['VTR', ['vtr']],
  ['LATAM', ['latam airlines', 'latam']],
  ['Sky Airline', ['sky airline']],
  ['JetSMART', ['jetsmart']],
  ['Airbnb', ['airbnb']],
  ['Booking', ['booking com', 'booking']],
  ['Turbus', ['turbus', 'tur bus']],
  ['Pullman', ['pullman bus', 'pullman']],
  ['Falabella', ['falabella']],
  ['Paris', ['paris']],
  ['Ripley', ['ripley']],
  ['Hites', ['hites']],
  ['H&M', ['h m']],
  ['Zara', ['zara']],
  ['Adidas', ['adidas']],
  ['Nike', ['nike']],
  ['Mercado Libre', ['mercadolibre', 'mercado libre']],
  ['AliExpress', ['aliexpress']],
  ['Temu', ['temu']],
  ['Shein', ['shein']],
  ['Amazon', ['amazon']],
  ['Steam', ['steam']],
  ['PlayStation', ['playstation']],
  ['ChatGPT', ['openai', 'chatgpt']],
].map(([nombre, formas]) => ({ nombre, clave: sinSignos(nombre), formas }));
// Gana la forma más larga: "uber eats" antes que "uber".
const FORMAS = MARCAS.flatMap(m => m.formas.map(forma => ({ forma, marca: m }))).sort((a, b) => b.forma.length - a.forma.length);

// Minúsculas, sin tildes ni signos, sin intermediario, sin números (sucursal,
// boleta) ni forma legal: lo que queda es el nombre. Si sin los números queda
// solo una palabra que no es una marca ("CAFE 1050", "BAR 21"), los números se
// quedan: son parte del nombre.
function limpiar(texto) {
  const t = sinSignos(normalizar(texto).replace(PROCESADORES, ''));
  const todas = t.split(' ').filter(p => p && !RUIDO.has(p));
  const sinNumeros = todas.filter(p => !/\d/.test(p));
  const palabras = !sinNumeros.length || sinNumeros.length > 1 || marcaDe(sinNumeros.join(' ')) ? sinNumeros : todas;
  let quitado = true;
  while (quitado) {
    quitado = false;
    const junto = palabras.join(' ');
    for (const fin of AL_FINAL) {
      const n = fin.split(' ').length;
      if (palabras.length > n && junto.endsWith(' ' + fin)) {
        palabras.splice(-n);
        quitado = true;
        break;
      }
    }
  }
  return palabras.join(' ');
}

const marcaDe = limpio => FORMAS.find(({ forma }) =>
  limpio === forma || limpio.startsWith(forma + ' ') || (forma.length >= 6 && (' ' + limpio + ' ').includes(' ' + forma + ' ')))?.marca ?? null;

// Una transferencia ("Transferencia a Juan") no es un comercio. Es la misma
// regla en toda la app (js/views/movimientos.js la usa para los gastos).
export const esTransferencia = texto => /^transferencia (a|de) /i.test(String(texto ?? '').trim());

// La clave con la que se reconoce un comercio: "jumbo", "la piccola italia".
// null si el texto no dice un comercio: vacío, solo números, una palabra
// genérica ("tienda"), una transferencia o un movimiento del banco.
export function claveComercio(texto) {
  if (esTransferencia(texto)) return null;
  const limpio = limpiar(texto);
  if (!limpio || GENERICAS.has(limpio) || DEL_BANCO.test(limpio)) return null;
  return marcaDe(limpio)?.clave ?? limpio;
}

// Para el nombre de un descuento del catálogo: se reduce a la marca solo si es
// una de sus formas ("Farmacias Cruz Verde" → "cruz verde"); una sub-marca
// ("PedidosYa Market") no es toda la marca y se queda como está.
export function claveExacta(texto) {
  const limpio = limpiar(texto);
  if (!limpio) return null;
  return FORMAS.find(({ forma }) => forma === limpio)?.marca.clave ?? limpio;
}

// Cómo se muestra un comercio nuevo: el nombre de la marca, o la clave con mayúsculas.
const MENORES = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en']);
export function nombreDeClave(clave) {
  const marca = MARCAS.find(m => m.clave === clave);
  if (marca) return marca.nombre;
  return clave.split(' ').map((p, i) => (i && MENORES.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1))).join(' ').slice(0, 60);
}

// Los gastos con comercio y sin comercio_id (los de antes de la tabla, los que
// llegan solos del banco) se enlazan a su comercio, creándolo si no existe; lo
// aprendido en reglas ("este comercio es de tal categoría") pasa a la categoría
// del comercio, si no tenía. Las transferencias y las reglas de ingresos se
// quedan en reglas. Si dos reglas del mismo comercio dicen categorías distintas
// ("copec" → Transporte, "copec pronto" → Comida), el comercio queda sin
// categoría y el clasificador sigue usando cada regla exacta.
// Se puede repetir sin duplicar. Devuelve los comercios y movimientos que
// cambian, o null si no hay nada que hacer.
export function pasarAComercios({ comercios = [], movimientos = [], reglas = [], categorias = [] }, crearId) {
  const porClave = new Map();
  for (const c of comercios) for (const p of c.patrones ?? []) if (!porClave.has(p)) porClave.set(p, c);
  const cambiados = new Map();
  const cambiar = c => {
    cambiados.set(c.id, c);
    for (const p of c.patrones) porClave.set(p, c);
    return c;
  };
  const conseguir = clave => porClave.get(clave) ?? cambiar({ id: crearId(), nombre: nombreDeClave(clave), patrones: [clave], categoria_id: null });

  const deIngreso = new Set(categorias.filter(c => c.tipo === 'ingreso').map(c => c.id));
  const porReglas = new Map();
  for (const r of reglas) {
    const clave = claveComercio(r.patron);
    if (!clave || !r.categoria_id || deIngreso.has(r.categoria_id)) continue;
    if (!porReglas.has(clave)) porReglas.set(clave, new Set());
    porReglas.get(clave).add(r.categoria_id);
  }
  for (const [clave, cats] of porReglas) {
    if (cats.size !== 1) continue;
    const c = conseguir(clave);
    if (!c.categoria_id) cambiar({ ...c, categoria_id: [...cats][0] });
  }
  const movidos = [];
  for (const m of movimientos) {
    if (m.comercio_id || m.tipo !== 'gasto') continue;
    const clave = claveComercio(m.comercio);
    if (clave) movidos.push({ ...m, comercio_id: conseguir(clave).id });
  }
  return cambiados.size || movidos.length ? { comercios: [...cambiados.values()], movimientos: movidos } : null;
}

// Una clave en un solo comercio: si dos la tienen (un respaldo editado a
// mano), se queda en el primero.
export function sinPatronesRepetidos(comercios) {
  const vistos = new Set();
  return comercios.map(c => {
    const patrones = c.patrones.filter(p => !vistos.has(p));
    patrones.forEach(p => vistos.add(p));
    return patrones.length === c.patrones.length ? c : { ...c, patrones };
  });
}
