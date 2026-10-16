// Valida y normaliza las filas que entran a la app desde fuera de su propio
// código: un respaldo importado (que pudo editar o enviar otra persona), el
// almacenamiento del navegador o la base de datos.
//
// Cada campo queda con el tipo que la app espera: los ids son UUID, los montos
// son números, los textos son texto y los estados son valores conocidos. Así
// un valor manipulado nunca llega a la página como HTML ni rompe los cálculos.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const FECHA = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

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
// Ids del catálogo de tarjetas (js/beneficios.js): 'santander', 'lider-bci'.
const ID_TARJETA = /^[a-z0-9-]{1,40}$/;
const tarjetas = v => (Array.isArray(v) ? [...new Set(v.filter(t => typeof t === 'string' && ID_TARJETA.test(t)))].slice(0, 30) : []);

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
  movimientos: f => ({
    fecha: typeof f.fecha === 'string' && FECHA.test(f.fecha) ? f.fecha : null,
    monto: entero(f.monto),
    tipo: opcion(f.tipo, ['gasto', 'ingreso']),
    descripcion: texto(f.descripcion, 200),
    comercio: texto(f.comercio, 120),
    categoria_id: id(f.categoria_id),
    evento_id: id(f.evento_id),
    compromiso_id: id(f.compromiso_id),
    deuda_id: id(f.deuda_id),
    origen: opcion(f.origen, ['manual', 'correo']),
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
// movimiento queda "sin categoría" y la regla sin su categoría se descarta.
// Es la misma lista de claves foráneas de supabase/schema.sql: si agregas una
// allá, agrégala aquí.
const REFERENCIAS = {
  compromisos: { categoria_id: 'categorias' },
  movimientos: { categoria_id: 'categorias', evento_id: 'eventos', compromiso_id: 'compromisos', deuda_id: 'deudas' },
  reglas: { categoria_id: 'categorias' },
};
// Tablas cuya referencia es obligatoria: sin ella, la fila no se guarda.
const SIN_REFERENCIA_SE_DESCARTA = new Set(['reglas']);

export function soltarHuerfanas(tablas) {
  const destinos = new Set(Object.values(REFERENCIAS).flatMap(Object.values));
  const existen = Object.fromEntries([...destinos].map(t => [t, new Set((tablas[t] ?? []).map(f => f.id))]));
  const resultado = { ...tablas };
  for (const [tabla, campos] of Object.entries(REFERENCIAS)) {
    const filas = [];
    for (const f of tablas[tabla] ?? []) {
      const rotos = Object.entries(campos).filter(([campo, destino]) => f[campo] && !existen[destino].has(f[campo]));
      if (!rotos.length) filas.push(f);
      else if (!SIN_REFERENCIA_SE_DESCARTA.has(tabla)) filas.push({ ...f, ...Object.fromEntries(rotos.map(([campo]) => [campo, null])) });
    }
    resultado[tabla] = filas;
  }
  return resultado;
}

export function normalizarPerfil(p) {
  p = p && typeof p === 'object' ? p : {};
  const limpio = {
    ingreso_mensual: entero(p.ingreso_mensual),
    meta_ahorro: entero(p.meta_ahorro),
    presupuesto_deudas: entero(p.presupuesto_deudas),
    revisado_mes: mes(p.revisado_mes),
    tarjetas: tarjetas(p.tarjetas),
  };
  // Respaldos de la primera versión guardaban solo el abono extra.
  if (p.pago_extra_deudas != null) limpio.pago_extra_deudas = entero(p.pago_extra_deudas);
  if (esUuid(p.user_id)) limpio.user_id = p.user_id;
  return limpio;
}
