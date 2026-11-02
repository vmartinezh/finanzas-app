// Tus comercios: leerlos, crearlos al anotar un gasto y juntar dos que son el
// mismo lugar. La parte que no toca los datos está en js/comercios.js.
//
// Si la nube todavía no tiene la tabla comercios (falta correr
// supabase/schema.sql), nada de esto guarda: los gastos quedan sin comercio_id
// y el clasificador sigue aprendiendo en reglas, como antes.
import { datos, guardar, guardarVarios, borrar, faltaTabla } from './db.js';
import { claveComercio, nombreDeClave } from './comercios.js';

export const hayComercios = () => !faltaTabla('comercios');
export const comercioPorId = id => datos.comercios.find(c => c.id === id) ?? null;

// El comercio que corresponde a cómo lo escribió el banco (o tú), o null.
export function comercioDe(texto) {
  const clave = claveComercio(texto);
  return clave ? datos.comercios.find(c => c.patrones.includes(clave)) ?? null : null;
}

// El comercio de ese texto, creándolo si no existe; con cambios (por ejemplo
// { categoria_id }) se actualiza. null si el texto no dice un comercio.
export async function comercioPara(texto, cambios = {}) {
  if (!hayComercios()) return null;
  const clave = claveComercio(texto);
  if (!clave) return null;
  const c = comercioDe(texto);
  if (c && Object.entries(cambios).every(([k, v]) => c[k] === v)) return c;
  return guardar('comercios', c ? { ...c, ...cambios } : { nombre: nombreDeClave(clave), patrones: [clave], categoria_id: null, ...cambios });
}

// El gasto con su comercio_id según su texto (un ingreso no tiene comercio).
// Se guarda después con el resto del gasto.
export async function conComercio(fila) {
  if (!hayComercios()) return fila;
  const c = fila.tipo === 'gasto' && fila.comercio ? await comercioPara(fila.comercio) : null;
  return { ...fila, comercio_id: c?.id ?? null };
}

// "Es el mismo lugar": los gastos y las formas de escribir el comercio origen
// pasan al destino, que se queda con su categoría (o toma la del origen si no
// tenía), y el origen se borra. Primero se guarda el destino y se mueven los
// gastos: así, si algo falla a medio camino, ningún gasto queda sin comercio.
export async function juntarComercios(origen, destino) {
  if (!origen || !destino || origen.id === destino.id) return destino;
  const junto = {
    ...destino,
    patrones: [...new Set([...destino.patrones, ...origen.patrones])],
    categoria_id: destino.categoria_id ?? origen.categoria_id ?? null,
  };
  await guardar('comercios', junto);
  const gastos = datos.movimientos.filter(m => m.comercio_id === origen.id);
  if (gastos.length) await guardarVarios('movimientos', gastos.map(m => ({ ...m, comercio_id: destino.id })));
  await borrar('comercios', origen.id);
  return junto;
}
