// Tus cuentas: reconocer tu RUT y tu nombre en los avisos del banco, para no
// anotar la plata que mueves entre tus propias cuentas.
//
// Lo usan la Edge Function recibir-compra (lectores.js) y la app (Ajustes y
// "Me la pasé yo"), para que el servidor y la app comparen igual. JavaScript
// puro, sin importar nada.

// "11.111.111-1", "11 111 111-1" o "111111111" → "11111111-1"; null si no es
// un RUT o si el dígito verificador no calza (así un error de tipeo no hace que
// una transferencia ajena se tome por tuya).
export function normalizarRut(texto) {
  if (typeof texto !== 'string') return null;
  const m = texto.replace(/[\s.]/g, '').toUpperCase().replace(/^0+/, '').match(/^(\d{6,8})-?([\dK])$/);
  if (!m) return null;
  let suma = 0;
  [...m[1]].reverse().forEach((d, i) => { suma += Number(d) * (2 + (i % 6)); });
  const resto = 11 - (suma % 11);
  const dv = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return dv === m[2] ? `${m[1]}-${dv}` : null;
}

// "VICENTE PÉREZ SOTO" y "Vicente Perez Soto" son la misma persona.
export const comoNombre = n => String(n ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

const palabras = n => comoNombre(n).split(' ').filter(Boolean);

// Un nombre sirve para reconocerte si tiene al menos dos palabras: "Rojas"
// solo podría ser cualquier pariente.
export const nombreSirve = n => palabras(n).length >= 2;

// Dos nombres son la misma persona si son iguales (sin tildes ni mayúsculas),
// o si el más corto tiene al menos tres palabras y todas están en el otro:
// "Ana Rojas Pino" es "ANA MARÍA ROJAS PINO". Con solo dos ("Ana Rojas") tienen
// que ser idénticos, porque "Ana María Rojas Fuentes" puede ser otra persona.
// Un nombre que no calza solo significa que esa transferencia llega por
// revisar, donde "Me la pasé yo" recuerda esa forma de escribirlo.
export function esMismoNombre(a, b) {
  const [corto, largo] = [palabras(a), palabras(b)].sort((x, y) => x.length - y.length);
  if (corto.length < 2) return false;
  if (corto.length === largo.length) return corto.join(' ') === largo.join(' ');
  return corto.length >= 3 && corto.every(p => largo.includes(p));
}

// ¿Es tu otra cuenta? El RUT manda: si el aviso trae el RUT de la otra cuenta
// y tú guardaste el tuyo, decide solo el RUT. El nombre sirve cuando falta
// alguno de los dos. propios: { rut, nombres } de tu perfil.
export function esPropio(propios, { rut = null, nombre = null } = {}) {
  if (!propios) return false;
  if (rut && propios.rut) return rut === propios.rut;
  return Boolean(nombre) && (propios.nombres ?? []).some(n => esMismoNombre(n, nombre));
}
