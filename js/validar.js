// Valida y normaliza las filas que entran a la app desde fuera de su propio
// código: un respaldo importado (que pudo editar o enviar otra persona), el
// almacenamiento del navegador o la base de datos.
//
// Cada campo queda con el tipo que la app espera: los ids son UUID, los montos
// son números, los textos son texto y los estados son valores conocidos. Así
// un valor manipulado nunca llega a la página como HTML ni rompe los cálculos.
import { NOMBRE_APP, hoyISO } from './util.js';
import { armarTarjeta } from './beneficios.js';
// Las mismas reglas que usa el servidor (recibir-compra), para que calcen siempre.
import { normalizarRut, nombreSirve, esMismoNombre } from '../supabase/functions/recibir-compra/cuentas.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const FECHA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// Una fecha con forma válida que además existe en el calendario (no un 31 de febrero).
const esFecha = v => typeof v === 'string' && FECHA.test(v) && new Date(v + 'T00:00:00Z').toISOString().startsWith(v);
const esUuid = v => typeof v === 'string' && UUID.test(v);
const id = v => (esUuid(v) ? v.toLowerCase() : null);
const texto = (v, max = 200) => (v == null || v === '' ? null : String(v).slice(0, max));
const entero = (v, min = 0) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(min, n) : 0;
};
const enteroONulo = (v, min, max) => {
  if (v == null || v === '') return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};
const decimal = v => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 1000) : 0;
};
const opcion = (v, opciones) => (opciones.includes(v) ? v : opciones[0]);
const mes = v => (typeof v === 'string' && MES.test(v) ? v : null);
const logico = v => v !== false;
// Ids del catálogo de tarjetas (js/beneficios.js): 'santander', 'lider-bci', y
// con el tipo de tarjeta (js/tarjetas.js): 'cmr:elite'; con los últimos 4
// dígitos, si la persona los puso: 'cmr:elite#1234'.
const ID_TARJETA = /^[a-z0-9-]{1,40}(?::[a-z0-9-]{1,40})?(?:#\d{4})?$/;
const idTarjeta = v => (typeof v === 'string' && ID_TARJETA.test(v) ? v : null);
const tarjetas = v => (Array.isArray(v) ? [...new Set(v.filter(t => typeof t === 'string' && ID_TARJETA.test(t)))].slice(0, 30) : []);
// Un id del catálogo ('santander', 'elite') o null.
const SLUG = /^[a-z0-9-]{1,40}$/;
const slug = v => (typeof v === 'string' && SLUG.test(v) ? v : null);
const cuatroDigitos = v => (typeof v === 'string' && /^\d{4}$/.test(v) ? v : null);
// Fecha de nacimiento: que exista, desde 1900 y no en el futuro. La usan el
// registro, Ajustes y el perfil que llega de la nube.
export const NACIMIENTO_MINIMO = '1900-01-01';
export const nacimiento = v => (esFecha(v) && v >= NACIMIENTO_MINIMO && v <= hoyISO() ? v : null);
// Tu ruta del cumpleañero (js/cumpleanos.js): el año y los ids del catálogo
// que elegiste y que ya usaste.
const ID_CUMPLE = /^[a-z0-9-]{1,40}$/;
const idsCumple = v => (Array.isArray(v) ? [...new Set(v.filter(t => typeof t === 'string' && ID_CUMPLE.test(t)))].slice(0, 100) : []);
function rutaCumpleanos(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  if (typeof v.anio !== 'number') return null;
  const anio = enteroONulo(v.anio, 1900, 2200);
  if (anio == null) return null;
  return { anio, elegidos: idsCumple(v.elegidos), usados: idsCumple(v.usados) };
}
// Tus nombres como los escribe cada banco: solo letras, espacios, puntos,
// apóstrofes y guiones, al menos dos palabras y sin repetir (lo que el servidor
// ya trata como la misma persona cuenta una vez), hasta 5.
const NOMBRE = /^\p{L}[\p{L} .'-]{1,79}$/u;
function nombresPropios(v) {
  if (!Array.isArray(v)) return [];
  const limpios = [];
  for (const n of v) {
    if (typeof n !== 'string') continue;
    const nombre = n.replace(/\s+/g, ' ').trim();
    if (NOMBRE.test(nombre) && nombreSirve(nombre) && !limpios.some(x => esMismoNombre(x, nombre))) limpios.push(nombre);
  }
  return limpios.slice(0, 5);
}

// Solo un link de Atajos de iCloud (https://www.icloud.com/shortcuts/<id>):
// cualquier otra cosa en la configuración se ignora.
export function linkDeAtajo(url) {
  return typeof url === 'string' && /^https:\/\/www\.icloud\.com\/shortcuts\/[0-9a-f]{32}\/?$/.test(url.trim()) ? url.trim() : null;
}

// Los usan Crear cuenta y Ajustes, para que digan lo mismo.
export const MENSAJE_RUT = 'Ese RUT no parece válido: revisa los números y el dígito verificador.';
export const MENSAJE_NOMBRE = 'Escribe tu nombre completo, con nombre y apellido, solo con letras.';
export const MENSAJE_FECHA = 'Revisa tu fecha de nacimiento: tiene que ser una fecha real y no en el futuro.';

// Crear cuenta: { rut, nombre[, fecha_nacimiento] } listos para guardar, o
// { error: 'nombre' | 'rut' | 'fecha' } con el primer campo que hay que
// corregir, en el orden del formulario. La fecha es opcional.
export function datosDeRegistro({ rut, nombre, fecha } = {}) {
  const [n] = nombresPropios([nombre]);
  if (!n) return { error: 'nombre' };
  const r = normalizarRut(rut);
  if (!r) return { error: 'rut' };
  const datos = { rut: r, nombre: n };
  if (fecha === undefined) return datos;
  const f = fecha ? nacimiento(fecha) : null;
  if (fecha && !f) return { error: 'fecha' };
  return { ...datos, fecha_nacimiento: f };
}

// Lo que se dio al crear la cuenta (user_metadata de Supabase: rut y full_name)
// pasa a "Tus cuentas" la primera vez que se entra. Devuelve los cambios para el
// perfil, o null si no hay nada que pasar, si ya hay un RUT ahí (no se pisa) o
// si ya se pasó antes (registro.en_perfil): si la persona lo borra en Ajustes,
// no vuelve a aparecer.
// La fecha de nacimiento sigue la misma regla, por separado.
export function perfilDesdeRegistro(perfil, registro) {
  if (!registro || registro.en_perfil) return null;
  const cambios = {};
  const rut = normalizarRut(registro.rut);
  if (rut && !perfil?.rut) {
    cambios.rut = rut;
    cambios.nombres_propios = nombresPropios([...(perfil?.nombres_propios ?? []), registro.full_name]);
  }
  const fecha = nacimiento(registro.fecha_nacimiento);
  if (fecha && !perfil?.fecha_nacimiento) cambios.fecha_nacimiento = fecha;
  return Object.keys(cambios).length ? cambios : null;
}

// En orden de dependencia: las primeras son referenciadas por las siguientes.
export const TABLAS = ['categorias', 'eventos', 'cuentas', 'deudas', 'compromisos', 'personas', 'cobros', 'movimientos', 'reglas'];

export const TIPOS_CUENTA = ['credito', 'debito', 'corriente', 'vista', 'efectivo'];

const FORMAS = {
  categorias: f => ({
    nombre: texto(f.nombre, 60) ?? 'Sin nombre',
    icono: texto(f.icono, 8) ?? '•',
    tipo: opcion(f.tipo, ['gasto', 'ingreso']),
    tope_mensual: entero(f.tope_mensual),
    palabras: texto(f.palabras, 500),
    orden: entero(f.orden),
  }),
  eventos: f => ({
    nombre: texto(f.nombre, 60) ?? 'Sin nombre',
    palabras: texto(f.palabras, 500),
    activo: logico(f.activo),
  }),
  // Tus tarjetas y, más adelante, tus cuentas del banco y el efectivo. Del
  // banco y del tipo de tarjeta se guarda solo su id del catálogo
  // (js/beneficios.js y js/tarjetas.js) y, si quieres, los últimos 4 dígitos.
  cuentas: f => ({
    tipo: opcion(f.tipo, TIPOS_CUENTA),
    institucion: slug(f.institucion),
    producto: slug(f.producto),
    terminacion: cuatroDigitos(f.terminacion),
    apodo: texto(f.apodo, 40),
    cupo_total: f.cupo_total ? entero(f.cupo_total) || null : null,
    dia_facturacion: enteroONulo(f.dia_facturacion, 1, 31),
    activa: logico(f.activa),
  }),
  deudas: f => ({
    nombre: texto(f.nombre, 80) ?? 'Sin nombre',
    acreedor: texto(f.acreedor, 80),
    saldo: entero(f.saldo),
    cuota_mensual: entero(f.cuota_mensual),
    cae: decimal(f.cae),
    dia_pago: enteroONulo(f.dia_pago, 1, 31),
    cupo_total: f.cupo_total ? entero(f.cupo_total) || null : null,
    fecha_limite: mes(f.fecha_limite),
    estado: opcion(f.estado, ['activa', 'pausa']),
    notas: texto(f.notas, 500),
    // La tarjeta (fila de cuentas) a la que corresponde esta deuda.
    cuenta_id: id(f.cuenta_id),
    // Antes de la tabla cuentas: la tarjeta como texto ('cmr:elite#1234'). Solo
    // se lee, para pasarla a cuentas (pasarTarjetasACuentas).
    tarjeta: idTarjeta(f.tarjeta),
  }),
  compromisos: f => ({
    nombre: texto(f.nombre, 80) ?? 'Sin nombre',
    monto: entero(f.monto),
    dia_pago: enteroONulo(f.dia_pago, 1, 31),
    categoria_id: id(f.categoria_id),
    activo: logico(f.activo),
    hasta_mes: mes(f.hasta_mes),
    pagados: Array.isArray(f.pagados) ? [...new Set(f.pagados.map(mes).filter(Boolean))] : [],
  }),
  personas: f => ({
    nombre: texto(f.nombre, 60) ?? 'Sin nombre',
  }),
  cobros: f => ({
    persona_id: id(f.persona_id),
    concepto: texto(f.concepto, 80) ?? 'Sin detalle',
    monto_total: entero(f.monto_total),
    cuotas: enteroONulo(f.cuotas, 1, 120) ?? 1,
    primer_vencimiento: esFecha(f.primer_vencimiento) ? f.primer_vencimiento : null,
    estado: opcion(f.estado, ['pendiente', 'perdonado']),
  }),
  movimientos: f => ({
    fecha: esFecha(f.fecha) ? f.fecha : null,
    monto: entero(f.monto),
    tipo: opcion(f.tipo, ['gasto', 'ingreso']),
    descripcion: texto(f.descripcion, 200),
    comercio: texto(f.comercio, 120),
    categoria_id: id(f.categoria_id),
    evento_id: id(f.evento_id),
    compromiso_id: id(f.compromiso_id),
    deuda_id: id(f.deuda_id),
    cobro_id: id(f.cobro_id),
    // Con cuál de tus tarjetas se pagó.
    cuenta_id: id(f.cuenta_id),
    origen: opcion(f.origen, ['manual', 'correo', 'wallet']),
    estado: opcion(f.estado, ['clasificado', 'pendiente']),
  }),
  reglas: f => ({
    patron: texto(f.patron, 120),
    categoria_id: id(f.categoria_id),
  }),
};

// Devuelve la fila limpia, o null si no se puede usar (sin id válido, o sin
// los datos mínimos, como la fecha de un movimiento).
export function normalizarFila(tabla, fila) {
  if (!fila || typeof fila !== 'object' || !esUuid(fila.id)) return null;
  const limpia = { id: fila.id.toLowerCase(), ...FORMAS[tabla](fila) };
  if (tabla === 'movimientos' && !limpia.fecha) return null;
  if (tabla === 'reglas' && (!limpia.patron || !limpia.categoria_id)) return null;
  if (tabla === 'cobros' && !limpia.persona_id) return null;
  // Campos que pone la base de datos en modo nube.
  if (esUuid(fila.user_id)) limpia.user_id = fila.user_id;
  if (fila.creado) limpia.creado = texto(fila.creado, 40);
  if (fila.id_externo) limpia.id_externo = texto(fila.id_externo, 200);
  return limpia;
}

export function normalizarTabla(tabla, filas) {
  return Array.isArray(filas) ? filas.map(f => normalizarFila(tabla, f)).filter(Boolean) : [];
}

// En un respaldo, una fila puede apuntar a una categoría, evento, compromiso o
// deuda que el mismo respaldo no trae (se borró, o el archivo se editó). La
// base de datos rechazaría esa fila, así que la referencia se suelta: el
// movimiento queda "sin categoría"; la regla sin su categoría y el cobro sin
// su persona se descartan.
// Es la misma lista de claves foráneas de supabase/schema.sql: si agregas una
// allá, agrégala aquí.
const REFERENCIAS = {
  deudas: { cuenta_id: 'cuentas' },
  compromisos: { categoria_id: 'categorias' },
  cobros: { persona_id: 'personas' },
  movimientos: { categoria_id: 'categorias', evento_id: 'eventos', compromiso_id: 'compromisos', deuda_id: 'deudas', cobro_id: 'cobros', cuenta_id: 'cuentas' },
  reglas: { categoria_id: 'categorias' },
};
// Tablas cuya referencia es obligatoria: sin ella, la fila no se guarda.
const SIN_REFERENCIA_SE_DESCARTA = new Set(['reglas', 'cobros']);

// Devuelve las tablas sin enlaces rotos y cuántos enlaces se soltaron.
function soltar(tablas) {
  const destinos = new Set(Object.values(REFERENCIAS).flatMap(Object.values));
  const existen = Object.fromEntries([...destinos].map(t => [t, new Set((tablas[t] ?? []).map(f => f.id))]));
  const resultado = { ...tablas };
  let sueltos = 0;
  for (const [tabla, campos] of Object.entries(REFERENCIAS)) {
    const filas = [];
    for (const f of tablas[tabla] ?? []) {
      const rotos = Object.entries(campos).filter(([campo, destino]) => f[campo] && !existen[destino].has(f[campo]));
      if (!rotos.length) {
        filas.push(f);
      } else if (!SIN_REFERENCIA_SE_DESCARTA.has(tabla)) {
        sueltos += rotos.length;
        filas.push({ ...f, ...Object.fromEntries(rotos.map(([campo]) => [campo, null])) });
      }
    }
    resultado[tabla] = filas;
  }
  return { tablas: resultado, sueltos };
}

// Lo que no puede repetirse dentro de una tabla, además del id: el patrón de
// una regla y el correo del banco del que salió un movimiento.
const UNICOS = { reglas: f => f.patron, movimientos: f => f.id_externo };

function sinRepetidos(tabla, filas) {
  const vistos = new Set();
  const vistosUnico = new Set();
  return filas.filter(f => {
    const unico = UNICOS[tabla]?.(f);
    if (vistos.has(f.id) || (unico && vistosUnico.has(unico))) return false;
    vistos.add(f.id);
    if (unico) vistosUnico.add(unico);
    return true;
  });
}

// Deja un respaldo listo para reemplazar los datos actuales: filas validadas,
// sin repetidos, sin enlaces rotos y con ids nuevos. Los ids nuevos evitan
// chocar con los de otra cuenta cuando el respaldo es de otra persona.
// Devuelve también cuántos enlaces se soltaron y cuántas filas no se pudieron
// usar (inválidas, repetidas o sin su categoría), para avisarle a la persona.
export function prepararRespaldo(copia, crearId) {
  if (!copia || typeof copia !== 'object' || copia.version !== 1) throw new Error(`El archivo no es un respaldo de ${NOMBRE_APP}`);
  const nombres = TABLAS;
  const validas = Object.fromEntries(nombres.map(t => [t, normalizarTabla(t, copia[t])]));
  if (!validas.categorias.length) throw new Error('El respaldo no trae categorías válidas');
  // Respaldos de antes de la tabla cuentas: las tarjetas venían en el perfil.
  const paso = pasarTarjetasACuentas({ tarjetas: tarjetas(copia.perfil?.tarjetas), cuentas: validas.cuentas, deudas: validas.deudas }, crearId);
  const creadas = paso ? paso.cuentas.filter(c => !validas.cuentas.some(x => x.id === c.id)).length : 0;
  if (paso) {
    validas.cuentas = mezclar(validas.cuentas, paso.cuentas);
    validas.deudas = mezclar(validas.deudas, paso.deudas);
  }
  // Las tarjetas se muestran en el orden en que se agregaron; al restaurar,
  // ese orden es el de la lista (la fecha original no viaja, ver schema.sql).
  const fechaDe = c => c.creado ?? '\uffff';
  validas.cuentas.sort((a, b) => (fechaDe(a) < fechaDe(b) ? -1 : fechaDe(a) > fechaDe(b) ? 1 : 0));
  // Primero se sueltan los enlaces rotos y después se sacan los repetidos: así
  // una regla repetida sin su categoría no le gana a su gemela válida.
  const soltadas = soltar(validas);
  const enteras = Object.fromEntries(nombres.map(t => [t, sinRepetidos(t, soltadas.tablas[t])]));
  const sueltos = soltadas.sueltos;
  const recibidas = creadas + nombres.reduce((n, t) => n + (Array.isArray(copia[t]) ? copia[t].length : 0), 0);
  const descartadas = recibidas - nombres.reduce((n, t) => n + enteras[t].length, 0);

  const idNuevo = Object.fromEntries(nombres.map(t => [t, new Map(enteras[t].map(f => [f.id, crearId()]))]));
  const tablas = Object.fromEntries(nombres.map(t => [t, enteras[t].map(({ user_id, creado, ...f }) => {
    const fila = { ...f, id: idNuevo[t].get(f.id) };
    for (const [campo, destino] of Object.entries(REFERENCIAS[t] ?? {})) {
      if (fila[campo]) fila[campo] = idNuevo[destino].get(fila[campo]);
    }
    return fila;
  })]));
  // Cada tarjeta, una deuda (la base lo exige): si dos apuntan a la misma, la segunda queda sin tarjeta.
  const conDeuda = new Set();
  tablas.deudas = tablas.deudas.map(d => {
    if (!d.cuenta_id) return d;
    if (conDeuda.has(d.cuenta_id)) return { ...d, cuenta_id: null };
    conDeuda.add(d.cuenta_id);
    return d;
  });

  const { pago_extra_deudas, user_id, ...perfil } = normalizarPerfil(copia.perfil);
  if (paso) perfil.tarjetas = [];
  // Respaldos de la primera versión guardaban solo el abono extra; se convierte al total.
  if (copia.perfil?.presupuesto_deudas == null && pago_extra_deudas) {
    perfil.presupuesto_deudas = tablas.deudas.reduce((s, d) => s + d.cuota_mensual, 0) + pago_extra_deudas;
  }
  return { tablas, perfil, sueltos, descartadas };
}

// Reemplaza las filas con el mismo id y agrega las nuevas al final.
export function mezclar(filas, cambios) {
  const porId = new Map(cambios.map(f => [f.id, f]));
  const ids = new Set(filas.map(f => f.id));
  return [...filas.map(f => porId.get(f.id) ?? f), ...cambios.filter(f => !ids.has(f.id))];
}

const claveDeCuenta = c => armarTarjeta({ banco: c.institucion, tipo: c.producto, terminacion: c.terminacion });

// Antes, tus tarjetas eran texto en perfil.tarjetas ('cmr:elite#1234') y cada
// deuda apuntaba a una con deudas.tarjeta. Ahora cada tarjeta es una fila de
// cuentas, y la deuda la apunta con cuenta_id. Esto hace el paso; en la nube lo
// hace supabase/schema.sql y esto cubre el modo local, los respaldos antiguos y
// lo que anote una versión vieja de la app que siga en caché.
// - Una tarjeta que ya está en cuentas no se repite.
// - Cada tarjeta, una deuda: la primera que la nombra.
// - El cupo pasa de la deuda a la tarjeta, salvo con moverCupo: false (cuando
//   la nube todavía no tiene la tabla y el paso queda solo en memoria).
// Devuelve las cuentas y deudas que cambian, o null si no hay tarjetas que pasar
// (después del paso, perfil.tarjetas queda vacío).
export function pasarTarjetasACuentas({ tarjetas: claves = [], cuentas = [], deudas = [] }, crearId, { moverCupo = true } = {}) {
  if (!claves.length) return null;
  // Solo las activas: una archivada no recibe deudas (no se vería en Tus tarjetas).
  const porClave = new Map(cuentas.filter(c => c.activa !== false).map(c => [claveDeCuenta(c), c]));
  const cambiadas = new Map();
  for (const t of claves) {
    if (!ID_TARJETA.test(t) || porClave.has(t)) continue;
    const [resto, terminacion = null] = t.split('#');
    const [institucion, producto = null] = resto.split(':');
    const c = { id: crearId(), tipo: 'credito', institucion, producto, terminacion, apodo: null, cupo_total: null, dia_facturacion: null, activa: true };
    porClave.set(t, c);
    cambiadas.set(c.id, c);
  }
  const conDeuda = new Set(deudas.map(d => d.cuenta_id).filter(Boolean));
  const deudasCambiadas = [];
  for (const d of deudas) {
    const c = !d.cuenta_id && d.tarjeta ? porClave.get(d.tarjeta) : null;
    if (!c || conDeuda.has(c.id)) continue;
    conDeuda.add(c.id);
    if (d.cupo_total && !c.cupo_total) {
      const conCupo = { ...c, cupo_total: d.cupo_total };
      porClave.set(d.tarjeta, conCupo);
      cambiadas.set(c.id, conCupo);
    }
    deudasCambiadas.push({ ...d, cuenta_id: c.id, cupo_total: moverCupo ? null : d.cupo_total });
  }
  return { cuentas: [...cambiadas.values()], deudas: deudasCambiadas };
}

export function normalizarPerfil(p) {
  p = p && typeof p === 'object' ? p : {};
  const limpio = {
    ingreso_mensual: entero(p.ingreso_mensual),
    meta_ahorro: entero(p.meta_ahorro),
    presupuesto_deudas: entero(p.presupuesto_deudas),
    revisado_mes: mes(p.revisado_mes),
    tarjetas: tarjetas(p.tarjetas),
    rut: normalizarRut(p.rut),
    nombres_propios: nombresPropios(p.nombres_propios),
    fecha_nacimiento: nacimiento(p.fecha_nacimiento),
    ruta_cumpleanos: rutaCumpleanos(p.ruta_cumpleanos),
  };
  // Respaldos de la primera versión guardaban solo el abono extra.
  if (p.pago_extra_deudas != null) limpio.pago_extra_deudas = entero(p.pago_extra_deudas);
  if (esUuid(p.user_id)) limpio.user_id = p.user_id;
  return limpio;
}
