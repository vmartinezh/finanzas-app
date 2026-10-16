import { datos } from './db.js';
import { mesDe, mesActual, diasDelMes, hoyISO, sumarMeses, sumarMesesFecha, normalizar } from './util.js';

export const movimientosDelMes = (mes = mesActual()) =>
  datos.movimientos.filter(m => mesDe(m.fecha) === mes);

// Gasto "variable": lo que no es un pago ya planificado (compromiso o cuota de deuda).
export const esGastoVariable = m => m.tipo === 'gasto' && !m.compromiso_id && !m.deuda_id;

// Un compromiso en cuotas ("TV en 12 cuotas") deja de contar después de hasta_mes.
export const compromisosActivos = (mes = mesActual()) =>
  datos.compromisos.filter(c => c.activo !== false && (!c.hasta_mes || c.hasta_mes >= mes));

// Deudas que se están pagando. Las "en pausa" (acordadas con la familia, por ejemplo)
// no entran al plan ni descuentan cuota hasta que se reactivan.
export const deudasVigentes = () => datos.deudas.filter(d => (d.saldo || 0) > 0 && d.estado !== 'pausa');
export const deudasEnPausa = () => datos.deudas.filter(d => (d.saldo || 0) > 0 && d.estado === 'pausa');

export const esSueldo = m => normalizar(datos.categorias.find(c => c.id === m.categoria_id)?.nombre) === 'sueldo';

// Lo que se destina a deudas al mes: el total que fijaste, pero nunca menos que
// la suma de las cuotas mínimas. Cuando una deuda se termina, su cuota pasa a
// abonar la siguiente en vez de quedar "libre" para gastar.
export function destinoDeudas() {
  const cuotas = deudasVigentes().reduce((s, d) => s + (d.cuota_mensual || 0), 0);
  return { cuotas, total: Math.max(cuotas, datos.perfil.presupuesto_deudas || 0) };
}

// El corazón de la app: cuánto puedes gastar en lo variable este mes.
//   sueldo - compromisos fijos - destino a deudas - ahorro - gasto variable
//   + lo que te devolvieron este mes ("Me deben")
// Los ingresos extra (bonos, cambiar dólares o reales) NO suben lo que puedes
// gastar: se muestran aparte para que decidas dónde ponerlos. Lo que te
// devuelven sí, porque no es plata nueva: es tuya y vuelve.
export function disponibleDelMes(mes = mesActual()) {
  const p = datos.perfil;
  const movs = movimientosDelMes(mes);

  const ingresos = movs.filter(m => m.tipo === 'ingreso');
  const sueldoRegistrado = ingresos.filter(esSueldo).reduce((s, m) => s + m.monto, 0);
  const cobrado = ingresos.filter(m => m.cobro_id && !esSueldo(m)).reduce((s, m) => s + m.monto, 0);
  const ingresosExtra = ingresos.filter(m => !esSueldo(m) && !m.cobro_id).reduce((s, m) => s + m.monto, 0);
  const ingreso = Math.max(p.ingreso_mensual || 0, sueldoRegistrado);
  const fijos = compromisosActivos(mes).reduce((s, c) => s + (c.monto || 0), 0);
  const { cuotas, total: aDeudas } = destinoDeudas();
  const extraDeudas = aDeudas - cuotas;
  const ahorro = p.meta_ahorro || 0;
  const paraVariable = ingreso - fijos - aDeudas - ahorro;
  const gastado = movs.filter(esGastoVariable).reduce((s, m) => s + m.monto, 0);
  const restante = paraVariable + cobrado - gastado;

  const totalDias = diasDelMes(mes);
  const hoy = hoyISO();
  const diasRestantes = mes === mesDe(hoy) ? totalDias - Number(hoy.slice(8)) + 1 : totalDias;
  const porDia = restante > 0 ? restante / diasRestantes : 0;

  return { ingreso, ingresosExtra, cobrado, fijos, cuotas, extraDeudas, aDeudas, ahorro, paraVariable, gastado, restante, diasRestantes, porDia, totalDias };
}

export function gastoPorCategoria(mes = mesActual(), { sinEventos = false } = {}) {
  const totales = new Map();
  for (const m of movimientosDelMes(mes)) {
    if (m.tipo !== 'gasto') continue;
    if (sinEventos && m.evento_id) continue;
    const clave = m.categoria_id || 'sin';
    totales.set(clave, (totales.get(clave) || 0) + m.monto);
  }
  return totales;
}

// Estado del presupuesto de una categoría: 'ok' | 'alerta' (≥80%) | 'excedido'
export function estadoPresupuesto(gastado, tope) {
  if (!tope) return 'sin-tope';
  const r = gastado / tope;
  if (r > 1) return 'excedido';
  if (r >= 0.8) return 'alerta';
  return 'ok';
}

// Compromisos que vencen este mes y aún no están marcados como pagados.
export function compromisosPendientes(mes = mesActual()) {
  return compromisosActivos(mes)
    .filter(c => !(c.pagados || []).includes(mes))
    .sort((a, b) => (a.dia_pago || 0) - (b.dia_pago || 0));
}

// Simula mes a mes el pago de las deudas con un total mensual fijo.
// estrategia 'avalancha': lo que sobra va a la deuda de CAE más alto.
// estrategia 'bola-de-nieve': va a la de menor saldo (más motivador, cuesta más).
// Cuando una deuda se termina, su cuota se suma al extra para la siguiente.
// Una deuda con fecha límite se paga entera, a más tardar, en ese mes.
// El CAE es una tasa anual efectiva: la tasa mensual equivalente es (1 + CAE)^(1/12) − 1.
//   presupuestoMensual: total al mes para deudas (nunca menos que las cuotas mínimas).
export function planDeudas(deudas, presupuestoMensual = 0, estrategia = 'avalancha') {
  const inicio = mesActual();
  const vivas = deudas
    .filter(d => (d.saldo || 0) > 0 && d.estado !== 'pausa')
    .map(d => ({
      id: d.id, nombre: d.nombre, saldo: d.saldo, cuota: d.cuota_mensual || 0,
      tasa: Math.pow(1 + (d.cae || 0) / 100, 1 / 12) - 1,
      fechaLimite: d.fecha_limite || null, interesPagado: 0, mesFin: null,
    }));

  if (!vivas.length) return { meses: 0, interesTotal: 0, deudas: [], imposible: false, fueraDePlazo: [] };

  const orden = estrategia === 'avalancha'
    ? (a, b) => b.tasa - a.tasa || a.saldo - b.saldo
    : (a, b) => a.saldo - b.saldo || b.tasa - a.tasa;

  const presupuesto = Math.max(presupuestoMensual, vivas.reduce((s, d) => s + d.cuota, 0));
  const LIMITE = 600;
  let mes = 0;

  while (vivas.some(d => d.saldo > 0.5) && mes < LIMITE) {
    mes++;
    const mesCalendario = sumarMeses(inicio, mes - 1);
    for (const d of vivas) {
      if (d.saldo <= 0) continue;
      const interes = d.saldo * d.tasa;
      d.saldo += interes;
      d.interesPagado += interes;
    }
    // Primero las cuotas mínimas, luego las que llegan a su fecha límite,
    // y todo lo que sobra a la prioritaria.
    let disponible = presupuesto;
    for (const d of vivas) {
      if (d.saldo <= 0) continue;
      const pago = Math.min(d.cuota, d.saldo, disponible);
      d.saldo -= pago;
      disponible -= pago;
    }
    for (const d of vivas) {
      if (d.saldo <= 0 || !d.fechaLimite || d.fechaLimite > mesCalendario) continue;
      const pago = Math.min(d.saldo, disponible);
      d.saldo -= pago;
      disponible -= pago;
    }
    for (const d of [...vivas].filter(d => d.saldo > 0).sort(orden)) {
      if (disponible <= 0) break;
      const pago = Math.min(d.saldo, disponible);
      d.saldo -= pago;
      disponible -= pago;
    }
    for (const d of vivas) {
      if (d.saldo <= 0.5 && d.mesFin === null) { d.saldo = 0; d.mesFin = mes; }
    }
  }

  const imposible = vivas.some(d => d.mesFin === null);
  const resultado = vivas
    .sort((a, b) => (a.mesFin ?? Infinity) - (b.mesFin ?? Infinity))
    .map(d => {
      const mesTermino = d.mesFin ? sumarMeses(inicio, d.mesFin - 1) : null;
      return {
        id: d.id, nombre: d.nombre, meses: d.mesFin, mesTermino, interes: d.interesPagado,
        fechaLimite: d.fechaLimite,
        fueraDePlazo: !!d.fechaLimite && (!mesTermino || mesTermino > d.fechaLimite),
      };
    });
  return {
    meses: imposible ? null : mes,
    interesTotal: vivas.reduce((s, d) => s + d.interesPagado, 0),
    imposible,
    deudas: resultado,
    fueraDePlazo: resultado.filter(d => d.fueraDePlazo),
  };
}

// Uso del cupo de una tarjeta. Sobre 85% es la señal de alerta del plan.
export function usoCupo(d) {
  if (!d.cupo_total) return null;
  const pct = (d.saldo || 0) / d.cupo_total * 100;
  return { pct, disponible: d.cupo_total - (d.saldo || 0), estado: pct >= 85 ? 'excedido' : pct >= 70 ? 'alerta' : 'ok' };
}

// Revisión de fin de mes: de los últimos 5 días del mes hasta el 3 del siguiente.
export function tocaRevision() {
  const hoy = hoyISO();
  const dia = Number(hoy.slice(8));
  const mes = mesDe(hoy);
  const mesARevisar = dia <= 3 ? sumarMeses(mes, -1) : mes;
  const enVentana = dia <= 3 || dia > diasDelMes(mes) - 5;
  return { mesARevisar, pendiente: enVentana && datos.perfil.revisado_mes !== mesARevisar };
}

// Gasto variable acumulado día a día, para comparar con el ritmo ideal.
export function acumuladoDiario(mes = mesActual()) {
  const total = diasDelMes(mes);
  const porDia = new Array(total).fill(0);
  for (const m of movimientosDelMes(mes)) {
    if (!esGastoVariable(m)) continue;
    porDia[Number(m.fecha.slice(8)) - 1] += m.monto;
  }
  const hoy = hoyISO();
  const ultimoDia = mes === mesDe(hoy) ? Number(hoy.slice(8)) : total;
  let suma = 0;
  return porDia.slice(0, ultimoDia).map(v => (suma += v));
}

// ---- Me deben ----

// Reparte un total en n partes enteras que suman exacto: los pesos que sobran
// van a las primeras (100 en 3 = 34, 33, 33).
export function repartir(total, n) {
  const base = Math.floor(total / n);
  const resto = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < resto ? 1 : 0));
}

// Las cuotas de un cobro: el total en partes enteras y, si tiene fecha, una
// cuota por mes desde la primera.
export function cuotasDeCobro(c) {
  const montos = repartir(c.monto_total || 0, Math.max(1, c.cuotas || 1));
  return montos.map((monto, i) => ({
    numero: i + 1,
    monto,
    vence: c.primer_vencimiento ? sumarMesesFecha(c.primer_vencimiento, i) : null,
  }));
}

export const pagosDeCobro = c => datos.movimientos.filter(m => m.cobro_id === c.id && m.tipo === 'ingreso');

// Lo pagado de cada cobro, sumando los movimientos una sola vez.
function pagadoPorCobro() {
  const total = new Map();
  for (const m of datos.movimientos) {
    if (m.cobro_id && m.tipo === 'ingreso') total.set(m.cobro_id, (total.get(m.cobro_id) || 0) + m.monto);
  }
  return total;
}

// Cuánto te han pagado, cuánto falta y qué cuota toca.
//   situacion: 'pagado' | 'perdonado' | 'atrasado' | 'hoy' | 'pendiente'
//   proxima.monto es lo que falta de esa cuota (menos que la cuota si te pagaron una parte).
//   vencido es todo lo que ya debió llegar hasta hoy (puede ser más de una cuota).
export function estadoCobro(c, hoy = hoyISO(), pagado = pagosDeCobro(c).reduce((s, m) => s + m.monto, 0)) {
  const pendiente = Math.max(0, (c.monto_total || 0) - pagado);
  const cuotas = cuotasDeCobro(c);
  let acumulado = 0;
  let cuotasPagadas = 0;
  let proxima = null;
  for (const cuota of cuotas) {
    acumulado += cuota.monto;
    if (pagado >= acumulado) { cuotasPagadas++; continue; }
    proxima = { numero: cuota.numero, monto: acumulado - pagado, vence: cuota.vence };
    break;
  }
  const perdonado = c.estado === 'perdonado';
  const saldado = perdonado || pendiente === 0;
  if (saldado) proxima = null;
  const situacion = perdonado ? 'perdonado' : pendiente === 0 ? 'pagado'
    : proxima?.vence && proxima.vence < hoy ? 'atrasado'
    : proxima?.vence === hoy ? 'hoy' : 'pendiente';
  const debioLlegar = cuotas.filter(q => q.vence && q.vence <= hoy).reduce((s, q) => s + q.monto, 0);
  const vencido = saldado ? 0 : Math.max(0, debioLlegar - pagado);
  return { pagado, pendiente: perdonado ? 0 : pendiente, vencido, cuotas: cuotas.length, cuotasPagadas, proxima, saldado, situacion };
}

const URGENCIA = { atrasado: 0, hoy: 1, pendiente: 2 };
// Primero lo atrasado, después lo de hoy, después por fecha; lo sin fecha al final.
const porUrgencia = (a, b) => URGENCIA[a.e.situacion] - URGENCIA[b.e.situacion]
  || (a.e.proxima?.vence ?? '9999').localeCompare(b.e.proxima?.vence ?? '9999');

// Lo que te deben, agrupado por persona y ordenado por urgencia.
export function resumenMeDeben(hoy = hoyISO()) {
  const nombres = new Map(datos.personas.map(p => [p.id, p]));
  const pagados = pagadoPorCobro();
  const todos = datos.cobros.map(c => ({ c, e: estadoCobro(c, hoy, pagados.get(c.id) || 0), persona: nombres.get(c.persona_id) })).filter(x => x.persona);
  const vivos = todos.filter(x => !x.e.saldado);
  const grupos = new Map();
  for (const x of vivos) {
    if (!grupos.has(x.persona.id)) grupos.set(x.persona.id, { persona: x.persona, cobros: [], pendiente: 0 });
    const g = grupos.get(x.persona.id);
    g.cobros.push(x);
    g.pendiente += x.e.pendiente;
  }
  const personas = [...grupos.values()].map(g => {
    g.cobros.sort(porUrgencia);
    return { ...g, e: g.cobros[0].e };
  }).sort(porUrgencia);
  return {
    personas,
    total: vivos.reduce((s, x) => s + x.e.pendiente, 0),
    atrasados: vivos.filter(x => x.e.situacion === 'atrasado').length,
    hoy: vivos.filter(x => x.e.situacion === 'hoy').length,
    saldados: todos.filter(x => x.e.saldado),
  };
}

// Para Inicio: lo que vence hoy o está atrasado.
export const cobrosDeHoy = (hoy = hoyISO()) =>
  resumenMeDeben(hoy).personas.flatMap(p => p.cobros).filter(x => x.e.situacion === 'atrasado' || x.e.situacion === 'hoy').sort(porUrgencia);

// Divide un gasto entre varias personas (y ti, si te incluyes) en partes
// enteras que suman exacto. Los pesos que sobran los ponen los demás.
export function dividirGasto(total, cuantos, meIncluyo) {
  if (!cuantos) return { porPersona: [], tuParte: total };
  // Tu parte va al final: así los pesos que sobran los ponen los demás.
  const porPersona = repartir(total, cuantos + (meIncluyo ? 1 : 0)).slice(0, cuantos);
  return { porPersona, tuParte: total - porPersona.reduce((s, n) => s + n, 0) };
}
