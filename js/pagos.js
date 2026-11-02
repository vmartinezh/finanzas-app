// Pagos de tus pagos fijos (compromisos). Una sola fuente: el pago de un mes es
// un movimiento con compromiso_id y mes_pagado. Sin acceso a la base: lo usan
// calculos.js, db.js (al cargar) y validar.js (respaldos viejos).
import { mesDe, diasDelMes, hoyISO } from './util.js';

// Prefijo del id_externo de los pagos que anota la app (botón "Pagado" o el paso
// desde compromisos.pagados). La base exige que id_externo sea único por
// persona: así un mismo mes no queda pagado dos veces aunque dos aparatos lo
// anoten a la vez.
const PREFIJO = 'pagado:';
export const idPago = (compromisoId, mes) => `${PREFIJO}${compromisoId}:${mes}`;
export const esPagoAnotado = mov => typeof mov.id_externo === 'string' && mov.id_externo.startsWith(PREFIJO);

// El mes que paga un movimiento: el que dice mes_pagado (el arriendo de
// noviembre pagado el 30 de octubre es de noviembre), o el de su fecha.
export const mesQuePaga = mov => mov.mes_pagado || mesDe(mov.fecha);

// Los pagos de ese mes: de un compromiso, o de todos si no se da uno.
export const pagosDelMes = (movimientos, mes, compromisoId = null) => movimientos.filter(m =>
  m.tipo === 'gasto' && m.compromiso_id && (!compromisoId || m.compromiso_id === compromisoId) && mesQuePaga(m) === mes);

// La fecha en que vence un compromiso ese mes (su día de pago, sin pasarse del
// último día del mes), o el día 1 si no tiene día fijo.
export function fechaDePago(c, mes) {
  const dia = Math.min(c.dia_pago || 1, diasDelMes(mes));
  return `${mes}-${String(dia).padStart(2, '0')}`;
}

// El movimiento que anota un pago con el monto del compromiso.
export const pagoAnotado = (c, mes, id, fecha = fechaDePago(c, mes)) => ({
  id, fecha, monto: c.monto || 0, tipo: 'gasto', descripcion: c.nombre, comercio: null,
  categoria_id: c.categoria_id ?? null, evento_id: null, compromiso_id: c.id, deuda_id: null,
  mes_pagado: mes, origen: 'manual', estado: 'clasificado', id_externo: idPago(c.id, mes),
});

// Antes, pagar un compromiso era agregar el mes a compromisos.pagados, a veces
// sin movimiento. Cada mes ahí sin pago pasa a un movimiento con el monto del
// compromiso, y pagados queda vacío (si no, al deshacer el pago, volvería a
// aparecer en la próxima carga). El pago queda en su día de pago, sin pasar de
// hoy: un movimiento con fecha futura no se entiende. Devuelve
// { movimientos, compromisos } con lo que hay que guardar, o null si no hay nada
// que pasar. Se puede repetir.
export function pasarAPagos({ compromisos, movimientos }, crearId, hoy = hoyISO()) {
  const nuevos = [];
  const vaciados = [];
  for (const c of compromisos) {
    if (!c.pagados?.length) continue;
    for (const mes of c.pagados) {
      const yaEsta = pagosDelMes(movimientos, mes, c.id).length
        || movimientos.some(m => m.id_externo === idPago(c.id, mes));
      const fecha = fechaDePago(c, mes);
      if (!yaEsta) nuevos.push(pagoAnotado(c, mes, crearId(), fecha > hoy ? hoy : fecha));
    }
    vaciados.push({ ...c, pagados: [] });
  }
  return vaciados.length ? { movimientos: nuevos, compromisos: vaciados } : null;
}
