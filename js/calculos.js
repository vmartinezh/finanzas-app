import { datos } from './db.js';
import { mesDe, mesActual, diasDelMes, hoyISO, sumarMeses } from './util.js';

export const movimientosDelMes = (mes = mesActual()) =>
  datos.movimientos.filter(m => mesDe(m.fecha) === mes);

// Gasto "variable": lo que no es un pago ya planificado (compromiso o cuota de deuda).
export const esGastoVariable = m => m.tipo === 'gasto' && !m.compromiso_id && !m.deuda_id;

// Un compromiso en cuotas ("TV en 12 cuotas") deja de contar después de hasta_mes.
export const compromisosActivos = (mes = mesActual()) =>
  datos.compromisos.filter(c => c.activo !== false && (!c.hasta_mes || c.hasta_mes >= mes));
export const deudasVigentes = () => datos.deudas.filter(d => (d.saldo || 0) > 0);

// El corazón de la app: cuánto puedes gastar en lo variable este mes.
//   ingreso - compromisos fijos - cuotas de deudas - ahorro - gasto variable
export function disponibleDelMes(mes = mesActual()) {
  const p = datos.perfil;
  const movs = movimientosDelMes(mes);

  const ingresoRegistrado = movs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0);
  const ingreso = Math.max(p.ingreso_mensual || 0, ingresoRegistrado);
  const fijos = compromisosActivos(mes).reduce((s, c) => s + (c.monto || 0), 0);
  const cuotas = deudasVigentes().reduce((s, d) => s + (d.cuota_mensual || 0), 0);
  const extraDeudas = p.pago_extra_deudas || 0;
  const ahorro = p.meta_ahorro || 0;
  const paraVariable = ingreso - fijos - cuotas - extraDeudas - ahorro;
  const gastado = movs.filter(esGastoVariable).reduce((s, m) => s + m.monto, 0);
  const restante = paraVariable - gastado;

  const totalDias = diasDelMes(mes);
  const hoy = hoyISO();
  const diasRestantes = mes === mesDe(hoy) ? totalDias - Number(hoy.slice(8)) + 1 : totalDias;
  const porDia = restante > 0 ? restante / diasRestantes : 0;

  return { ingreso, fijos, cuotas, extraDeudas, ahorro, paraVariable, gastado, restante, diasRestantes, porDia, totalDias };
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

// Simula mes a mes el pago de las deudas.
// estrategia 'avalancha': el dinero extra va a la deuda de CAE más alto.
// estrategia 'bola-de-nieve': va a la de menor saldo (más motivador, cuesta más).
// Cuando una deuda se termina, su cuota se suma al extra para la siguiente.
// El CAE es una tasa anual efectiva: la tasa mensual equivalente es (1 + CAE)^(1/12) − 1.
export function planDeudas(deudas, extraMensual = 0, estrategia = 'avalancha') {
  const vivas = deudas
    .filter(d => (d.saldo || 0) > 0)
    .map(d => ({ id: d.id, nombre: d.nombre, saldo: d.saldo, cuota: d.cuota_mensual || 0, tasa: Math.pow(1 + (d.cae || 0) / 100, 1 / 12) - 1, interesPagado: 0, mesFin: null }));

  if (!vivas.length) return { meses: 0, interesTotal: 0, deudas: [], imposible: false };

  const orden = estrategia === 'avalancha'
    ? (a, b) => b.tasa - a.tasa || a.saldo - b.saldo
    : (a, b) => a.saldo - b.saldo || b.tasa - a.tasa;

  const presupuesto = vivas.reduce((s, d) => s + d.cuota, 0) + extraMensual;
  const LIMITE = 600;
  let mes = 0;

  while (vivas.some(d => d.saldo > 0.5) && mes < LIMITE) {
    mes++;
    for (const d of vivas) {
      if (d.saldo <= 0) continue;
      const interes = d.saldo * d.tasa;
      d.saldo += interes;
      d.interesPagado += interes;
    }
    // Primero las cuotas mínimas, después todo lo que sobra a la prioritaria.
    let disponible = presupuesto;
    for (const d of vivas) {
      if (d.saldo <= 0) continue;
      const pago = Math.min(d.cuota, d.saldo, disponible);
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
  const inicio = mesActual();
  return {
    meses: imposible ? null : mes,
    interesTotal: vivas.reduce((s, d) => s + d.interesPagado, 0),
    imposible,
    deudas: vivas
      .sort((a, b) => (a.mesFin ?? Infinity) - (b.mesFin ?? Infinity))
      .map(d => ({ id: d.id, nombre: d.nombre, meses: d.mesFin, mesTermino: d.mesFin ? sumarMeses(inicio, d.mesFin - 1) : null, interes: d.interesPagado })),
  };
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
