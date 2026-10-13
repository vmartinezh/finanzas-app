// Revisión de fin de mes: el checklist del plan, con lo que la app ya sabe.
import { datos, guardar, guardarPerfil } from '../db.js';
import { disponibleDelMes, deudasVigentes, movimientosDelMes, usoCupo, tocaRevision, esSueldo } from '../calculos.js';
import { abrirFormulario, ejecutar } from '../ui.js';
import { clp, esc, nombreMes, hoyISO, mesDe } from '../util.js';
import { editarMovimiento } from './movimientos.js';

export const titulo = 'Revisión del mes';

function punto(estado, tituloPunto, detalle, accion = '') {
  const icono = { ok: '✓', alerta: '⚠', pendiente: '○' }[estado];
  return `<li class="punto-revision" data-estado="${estado}">
    <span class="punto-icono" aria-hidden="true">${icono}</span>
    <div class="punto-texto"><b>${tituloPunto}</b><small>${detalle}</small>${accion}</div>
  </li>`;
}

export function render() {
  const { mesARevisar: mes } = tocaRevision();
  const d = disponibleDelMes(mes);
  const movs = movimientosDelMes(mes);
  const p = datos.perfil;
  const hecha = p.revisado_mes === mes;

  const sueldo = movs.filter(m => m.tipo === 'ingreso' && esSueldo(m)).reduce((s, m) => s + m.monto, 0);
  // Se revisan las deudas que tocan este mes: con cuota, tarjetas, o con fecha límite ya cumplida.
  const pagosDeudas = deudasVigentes()
    .filter(x => x.cuota_mensual > 0 || x.cupo_total || (x.fecha_limite && x.fecha_limite <= mes))
    .map(deuda => ({
    deuda,
    pagado: movs.filter(m => m.deuda_id === deuda.id).reduce((s, m) => s + m.monto, 0),
  }));
  const tarjetasAltas = datos.deudas.filter(x => x.saldo > 0 && usoCupo(x)?.estado === 'excedido');
  const eventos = movs.filter(m => m.tipo === 'gasto' && m.evento_id).reduce((s, m) => s + m.monto, 0);
  const sinRevisar = datos.movimientos.filter(m => m.estado === 'pendiente').length;

  const puntos = [
    punto(sueldo >= (p.ingreso_mensual || 0) && sueldo > 0 ? 'ok' : 'pendiente', 'Ingreso del mes',
      sueldo ? `Registraste ${clp(sueldo)} de sueldo${p.ingreso_mensual && sueldo < p.ingreso_mensual ? `, menos que los ${clp(p.ingreso_mensual)} del plan` : ''}.` : `Registra el sueldo (${clp(p.ingreso_mensual)} según el plan) con el botón +.`),

    punto(d.gastado <= d.paraVariable ? 'ok' : 'alerta', 'Gastos dentro del límite',
      `Gastaste ${clp(d.gastado)} de ${clp(d.paraVariable)} disponibles para el día a día.${d.gastado > d.paraVariable ? ` Te pasaste por ${clp(d.gastado - d.paraVariable)}: ¿de dónde salió?` : ''}`),

    ...pagosDeudas.map(({ deuda, pagado }) => punto(
      pagado >= (deuda.cuota_mensual || 1) ? 'ok' : 'pendiente', `Pago: ${esc(deuda.nombre)}`,
      pagado ? `Pagaste ${clp(pagado)}${deuda.cuota_mensual && pagado < deuda.cuota_mensual ? `, menos que la cuota de ${clp(deuda.cuota_mensual)}` : ''}.` : (deuda.cuota_mensual ? `Cuota de ${clp(deuda.cuota_mensual)}.` : 'Sin cuota fija este mes.'),
      `<button class="boton pequeño" data-pagar-deuda="${deuda.id}">Registrar pago</button>`)),

    punto(hecha ? 'ok' : 'pendiente', 'Saldos actualizados con la cartola',
      'Los saldos de la app son estimados. Ajústalos con lo que dice cada estado de cuenta.',
      `<button class="boton pequeño" id="actualizar-saldos">Actualizar saldos</button>`),

    punto(tarjetasAltas.length ? 'alerta' : 'ok', 'Tarjetas bajo 85% de uso',
      tarjetasAltas.length ? `${tarjetasAltas.map(t => esc(t.nombre)).join(', ')} sobre 85%. No uses esa tarjeta hasta bajarla.` : 'Ninguna tarjeta está sobre el 85%.'),

    punto(eventos ? 'alerta' : 'ok', 'Gastos extraordinarios',
      eventos ? `Hubo ${clp(eventos)} en eventos este mes. ¿Estaban previstos?` : 'No hubo gastos de eventos.'),

    punto(sinRevisar ? 'pendiente' : 'ok', 'Compras clasificadas',
      sinRevisar ? `Quedan ${sinRevisar} compras por revisar.` : 'Todas las compras tienen categoría.',
      sinRevisar ? '<a class="boton pequeño" href="#/movimientos">Revisarlas</a>' : ''),
  ];

  return `
    <section class="tarjeta">
      <h2>Revisión de ${esc(nombreMes(mes))}</h2>
      <p class="ayuda">Diez minutos a fin de mes para confirmar que el plan va bien y ajustar lo que no.</p>
      <ul class="lista-revision">${puntos.join('')}</ul>
      ${d.ingresosExtra ? `<p class="mensaje ok">Este mes entraron ${clp(d.ingresosExtra)} extra. Lo que más rinde es abonarlos a la deuda con CAE más alto.</p>` : ''}
      ${hecha
        ? '<p class="mensaje ok">✓ Revisión hecha.</p>'
        : '<button class="boton primario" id="marcar-hecha">Marcar revisión como hecha</button>'}
    </section>
  `;
}

export function montar(raiz, refrescar) {
  const { mesARevisar: mes } = tocaRevision();

  raiz.querySelectorAll('[data-pagar-deuda]').forEach(b => b.addEventListener('click', () => {
    const deuda = datos.deudas.find(x => x.id === b.dataset.pagarDeuda);
    const fecha = mesDe(hoyISO()) === mes ? hoyISO() : `${mes}-28`;
    editarMovimiento({ tipo: 'gasto', fecha, deuda_id: deuda.id, descripcion: `Pago ${deuda.nombre}`, monto: deuda.cuota_mensual || null }, refrescar);
  }));

  raiz.querySelector('#actualizar-saldos').addEventListener('click', async () => {
    const deudas = datos.deudas.filter(x => x.saldo > 0);
    if (!deudas.length) return;
    const v = await abrirFormulario({
      titulo: 'Saldos según la cartola',
      intro: 'Escribe lo que debes hoy en cada una.',
      campos: deudas.map(x => ({ nombre: x.id, etiqueta: `${x.nombre} ($)`, tipo: 'monto', valor: x.saldo, requerido: true })),
    });
    if (!v) return;
    ejecutar(async () => {
      for (const x of deudas) {
        const saldo = Math.max(0, Math.round(v[x.id] ?? x.saldo));
        if (saldo !== x.saldo) await guardar('deudas', { ...x, saldo });
      }
    }, 'Saldos actualizados', refrescar);
  });

  raiz.querySelector('#marcar-hecha')?.addEventListener('click', () => {
    ejecutar(() => guardarPerfil({ revisado_mes: mes }), '¡Bien! Revisión guardada', refrescar);
  });
}
