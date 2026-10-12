// Adivina la categoría (y el evento) de una compra a partir del comercio y
// de lo que escribes ("uber al aeropuerto para lo del matri").
//
// Orden de prioridad:
//   1. Reglas aprendidas: la última vez que clasificaste ese comercio.
//   2. Palabras clave de abajo + las que agregues a cada categoría.
// Más adelante, en la fase 3, lo que no se resuelva aquí se mandará a la IA.
import { datos, guardar } from './db.js';
import { normalizar } from './util.js';

// Palabras clave por nombre de categoría (de las categorías por defecto).
const PALABRAS_BASE = {
  'supermercado': ['lider', 'jumbo', 'unimarc', 'tottus', 'santa isabel', 'acuenta', 'supermercado', 'super', 'mayorista', 'feria', 'almacen'],
  'comida fuera': ['restaurant', 'restoran', 'cafe', 'starbucks', 'mcdonald', 'burger', 'sushi', 'pizza', 'rappi', 'pedidosya', 'uber eats', 'almuerzo', 'cena', 'once', 'completo', 'bar'],
  'transporte': ['uber', 'cabify', 'didi', 'metro', 'bip', 'copec', 'shell', 'petrobras', 'aramco', 'bencina', 'estacionamiento', 'peaje', 'tag', 'autopista', 'taxi', 'micro'],
  'hogar': ['arriendo', 'dividendo', 'enel', 'cge', 'aguas andinas', 'esval', 'metrogas', 'abastible', 'lipigas', 'gasco', 'gastos comunes', 'sodimac', 'easy', 'homecenter', 'ikea'],
  'salud': ['farmacia', 'cruz verde', 'salcobrand', 'ahumada', 'clinica', 'medico', 'doctor', 'dentista', 'isapre', 'fonasa', 'examen'],
  'entretencion': ['cine', 'cinemark', 'cineplanet', 'concierto', 'ticketmaster', 'puntoticket', 'steam', 'playstation', 'xbox', 'juego'],
  'ropa': ['zara', 'h&m', 'falabella', 'paris', 'ripley', 'hites', 'ropa', 'zapatos', 'zapatillas', 'adidas', 'nike'],
  'regalos': ['regalo', 'cumpleanos', 'cumple', 'flores'],
  'suscripciones': ['netflix', 'spotify', 'disney', 'hbo', 'prime video', 'youtube', 'icloud', 'google one', 'chatgpt', 'claude', 'entel', 'movistar', 'wom', 'vtr'],
  'viajes': ['latam', 'sky airline', 'jetsmart', 'gol', 'azul', 'hotel', 'airbnb', 'booking', 'pasaje', 'vuelo', 'turbus', 'pullman'],
};

function palabrasDe(categoria) {
  const base = PALABRAS_BASE[normalizar(categoria.nombre)] || [];
  const propias = String(categoria.palabras || '').split(',').map(normalizar).filter(Boolean);
  return [...propias, ...base];
}

const contiene = (texto, palabra) => (' ' + texto + ' ').includes(palabra.length <= 4 ? ' ' + palabra + ' ' : palabra);

export function clasificar({ comercio = '', descripcion = '' }) {
  const comercioN = normalizar(comercio);
  const texto = normalizar(`${descripcion} ${comercio}`);
  const resultado = { categoria_id: null, evento_id: null, motivo: null };

  // Lo que escribes manda sobre lo aprendido: "uber para el matri" ≠ "uber al trabajo".
  if (descripcion) {
    const cat = buscarPorPalabras(normalizar(descripcion));
    if (cat) Object.assign(resultado, { categoria_id: cat.id, motivo: 'por lo que escribiste' });
  }
  if (!resultado.categoria_id && comercioN) {
    const regla = datos.reglas.find(r => r.patron === comercioN);
    if (regla && datos.categorias.some(c => c.id === regla.categoria_id)) {
      Object.assign(resultado, { categoria_id: regla.categoria_id, motivo: 'como la última vez' });
    }
  }
  if (!resultado.categoria_id) {
    const cat = buscarPorPalabras(texto);
    if (cat) Object.assign(resultado, { categoria_id: cat.id, motivo: 'por el nombre del comercio' });
  }

  const evento = datos.eventos.find(e => e.activo !== false && palabrasEvento(e).some(p => contiene(texto, p)));
  if (evento) resultado.evento_id = evento.id;

  return resultado;
}

function buscarPorPalabras(texto) {
  let mejor = null;
  let largoMejor = 0;
  // Gana la palabra más larga que calce: "uber eats" le gana a "uber".
  for (const cat of datos.categorias) {
    if (cat.tipo === 'ingreso') continue;
    for (const p of palabrasDe(cat)) {
      if (p.length > largoMejor && contiene(texto, p)) {
        mejor = cat;
        largoMejor = p.length;
      }
    }
  }
  return mejor;
}

function palabrasEvento(evento) {
  return [evento.nombre, ...String(evento.palabras || '').split(',')].map(normalizar).filter(Boolean);
}

// Cuando clasificas a mano una compra con comercio, se recuerda para la próxima.
export async function aprender(comercio, categoria_id) {
  const patron = normalizar(comercio);
  if (!patron || !categoria_id) return;
  const existente = datos.reglas.find(r => r.patron === patron);
  if (existente?.categoria_id === categoria_id) return;
  await guardar('reglas', { ...(existente || {}), patron, categoria_id });
}
