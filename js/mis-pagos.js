// Marcar y deshacer el pago de un pago fijo (compromiso). El pago es un
// movimiento (ver js/pagos.js); compromisos.pagados ya no se escribe.
import { datos, guardar, borrar, nuevoId } from './db.js';
import { pagoAnotado, pagosDelMes, esPagoAnotado } from './pagos.js';
import { hoyISO, mesDe } from './util.js';

// "Pagado" sin monto: anota el pago con el monto del compromiso. Si es el mes en
// curso, con fecha de hoy (cuando lo marcaste); si no, en su día de pago.
export async function marcarPagado(c, mes) {
  if (pagosDelMes(datos.movimientos, mes, c.id).length) return;
  const hoy = hoyISO();
  const fila = mesDe(hoy) === mes ? pagoAnotado(c, mes, nuevoId(), hoy) : pagoAnotado(c, mes, nuevoId());
  await guardar('movimientos', fila);
}

// Los pagos de ese mes que no anotó la app: compras reales (del banco, del
// Atajo o anotadas a mano). Antes de deshacerlos hay que preguntar.
export const pagosReales = (c, mes) => pagosDelMes(datos.movimientos, mes, c.id).filter(m => !esPagoAnotado(m));

// Suelta un pago real de su compromiso: pasa a ser gasto del día a día.
const soltar = m => guardar('movimientos', { ...m, compromiso_id: null, mes_pagado: null });

// Deshacer: el pago que anotó la app se borra; una compra real no se borra, solo
// deja de ser el pago de ese mes (quien llama confirma antes: ver pagosReales).
export async function deshacerPago(c, mes) {
  for (const m of pagosDelMes(datos.movimientos, mes, c.id)) {
    if (esPagoAnotado(m)) await borrar('movimientos', m.id);
    else await soltar(m);
  }
  // Un mes marcado como antes (si todavía no se pudo pasar a movimientos).
  if ((c.pagados || []).includes(mes)) await guardar('compromisos', { ...c, pagados: c.pagados.filter(x => x !== mes) });
}

// Borrar un pago fijo se lleva sus pagos anotados (como antes se iban con
// pagados); las compras reales quedan como gastos, sin compromiso. Así es igual
// en la nube (donde la base suelta compromiso_id) y en el modo local.
export async function borrarCompromiso(c) {
  for (const m of datos.movimientos.filter(x => x.compromiso_id === c.id)) {
    if (esPagoAnotado(m)) await borrar('movimientos', m.id);
    else await soltar(m);
  }
  await borrar('compromisos', c.id);
}
