import { datos } from './db.js';
import { mesDe, mesActual, diasDelMes, hoyISO, sumarMeses, normalizar } from './util.js';

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
// Los ingresos extra (bonos, cambiar dólares o reales) NO suben lo que puedes
// gastar: se muestran aparte para que decidas dónde ponerlos.
export function disponibleDelMes(mes = mesActual()) {
  const p = datos.perfil;
  const movs = movimientosDelMes(mes);

  const ingresos = movs.filter(m => m.tipo === 'ingreso');
  const sueldoRegistrado = ingresos.filter(esSueldo).reduce((s, m) => s + m.monto, 0);
  const ingresosExtra = ingresos.filter(m => !esSueldo(m)).reduce((s, m) => s + m.monto, 0);
  const ingreso = Math.max(p.ingreso_mensual || 0, sueldoRegistrado);
  const fijos = compromisosActivos(mes).reduce((s, c) => s + (c.monto || 0), 0);
  const { cuotas, total: aDeudas } = destinoDeudas();
  const extraDeudas = aDeudas - cuotas;
  const ahorro = p.meta_ahorro || 0;
  const paraVariable = ingreso - fijos - aDeudas - ahorro;
  const gastado = movs.filter(esGastoVariable).reduce((s, m) => s + m.monto, 0);
  const restante = paraVariable - gastado;

  const totalDias = diasDelMes(mes);
  const hoy = hoyISO();
  const diasRestantes = mes === mesDe(hoy) ? totalDias - Number(hoy.slice(8)) + 1 : totalDias;
  const porDia = restante > 0 ? restante / diasRestantes : 0;

  return { ingreso, ingresosExtra, fijos, cuotas, extraDeudas, aDeudas, ahorro, paraVariable, gastado, restante, diasRestantes, porDia, totalDias };
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
