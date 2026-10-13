import { datos, guardar } from '../db.js';
import { disponibleDelMes, compromisosPendientes, gastoPorCategoria, estadoPresupuesto, acumuladoDiario, usoCupo, tocaRevision } from '../calculos.js';
import { graficoRitmo } from '../graficos.js';
import { ejecutar, barraProgreso, ICONO_ESTADO } from '../ui.js';
import { clp, esc, mesActual, nombreMes, hoyISO, porcentaje } from '../util.js';
import { filaMovimiento, montarFilas } from './movimientos.js';

export const titulo = 'Inicio';

export function render() {
  const mes = mesActual();
  const d = disponibleDelMes(mes);
  const pendientes = datos.movimientos.filter(m => m.estado === 'pendiente').sort((a, b) => b.fecha.localeCompare(a.fecha));
  const porPagar = compromisosPendientes(mes);
  const hoy = Number(hoyISO().slice(8));
  const sinConfigurar = !datos.perfil.ingreso_mensual;

  const gastos = gastoPorCategoria(mes);
  const alertas = datos.categorias
    .filter(c => c.tope_mensual > 0)
    .map(c => ({ c, gastado: gastos.get(c.id) || 0 }))
    .map(x => ({ ...x, estado: estadoPresupuesto(x.gastado, x.c.tope_mensual) }))
    .filter(x => x.estado !== 'ok')
    .sort((a, b) => b.gastado / b.c.tope_mensual - a.gastado / a.c.tope_mensual);

  const enRojo = d.restante < 0;
  const tarjetasAltas = datos.deudas.filter(x => x.saldo > 0 && usoCupo(x)?.estado === 'excedido');
  const revision = tocaRevision();
  const masCara = datos.deudas.filter(x => x.saldo > 0 && x.estado !== 'pausa').sort((a, b) => (b.cae || 0) - (a.cae || 0))[0];

  return `
    ${revision.pendiente ? `
      <a class="tarjeta destacada enlace-tarjeta" href="#/revision">
        <h2>✅ Toca la revisión de ${esc(nombreMes(revision.mesARevisar, false))}</h2>
        <p>Diez minutos: confirmar pagos, actualizar saldos y ver si el plan va bien.</p>
      </a>` : ''}

    ${tarjetasAltas.map(t => `
      <section class="tarjeta alerta-tarjeta">
        <h2>⚠ ${esc(t.nombre)} sobre el 85% del cupo</h2>
        <p>Usas el ${Math.round(usoCupo(t).pct)}%. No la uses para gastos del día a día hasta bajarla.</p>
      </section>`).join('')}

    ${sinConfigurar ? `
      <section class="tarjeta destacada">
        <h2>Partamos por lo básico</h2>
        <p>Dime cuánto te entra al mes y tus pagos fijos, y la app te dirá cuánto puedes gastar cada día.</p>
        <a class="boton primario" href="#/ajustes">Configurar mi mes</a>
      </section>` : ''}

    <section class="tarjeta hero" aria-labelledby="titulo-disponible">
      <p class="hero-etiqueta" id="titulo-disponible">${enRojo ? 'Este mes te pasaste por' : 'Puedes gastar hoy'}</p>
      <p class="hero-numero ${enRojo ? 'negativo' : ''}">${clp(enRojo ? -d.restante : d.porDia)}</p>
      <p class="hero-detalle">${enRojo
        ? 'Ya gastaste más de lo disponible para el mes. Lo que gastes ahora sale del ahorro o de deuda.'
        : `Te quedan <b>${clp(d.restante)}</b> para ${d.diasRestantes} ${d.diasRestantes === 1 ? 'día' : 'días'} de ${esc(nombreMes(mes, false))}.`}</p>
      <details class="desglose">
        <summary>¿De dónde sale este número?</summary>
        <dl>
          <div><dt>Ingreso del mes</dt><dd>${clp(d.ingreso)}</dd></div>
          <div><dt>− Pagos fijos</dt><dd>${clp(d.fijos)}</dd></div>
          <div><dt>− Cuotas de deudas</dt><dd>${clp(d.cuotas)}</dd></div>
          ${d.extraDeudas ? `<div><dt>− Abono extra a deudas</dt><dd>${clp(d.extraDeudas)}</dd></div>` : ''}
          ${d.ahorro ? `<div><dt>− Ahorro</dt><dd>${clp(d.ahorro)}</dd></div>` : ''}
          <div class="subtotal"><dt>= Para el día a día</dt><dd>${clp(d.paraVariable)}</dd></div>
          <div><dt>− Ya gastado</dt><dd>${clp(d.gastado)}</dd></div>
          <div class="subtotal"><dt>= Te queda</dt><dd>${clp(d.restante)}</dd></div>
        </dl>
      </details>
    </section>

    ${d.ingresosExtra ? `
      <section class="tarjeta">
        <h2>Plata extra este mes: ${clp(d.ingresosExtra)}</h2>
        <p class="ayuda">No la sumé a lo que puedes gastar.${masCara?.cae ? ` Donde más rinde es abonándola a <b>${esc(masCara.nombre)}</b> (CAE ${porcentaje(masCara.cae)}), o guardándola como fondo de emergencia.` : ' Puedes guardarla como fondo de emergencia.'}</p>
      </section>` : ''}

    ${pendientes.length ? `
      <section class="tarjeta">
        <h2>Por revisar <span class="contador">${pendientes.length}</span></h2>
        <p class="ayuda">Compras que llegaron sin contexto. Tócalas y cuéntame qué fueron.</p>
        <ul class="lista">${pendientes.slice(0, 5).map(filaMovimiento).join('')}</ul>
        ${pendientes.length > 5 ? '<a class="enlace" href="#/movimientos">Ver todas</a>' : ''}
      </section>` : ''}

    ${alertas.length ? `
      <section class="tarjeta">
        <h2>Ojo con estas categorías</h2>
        <ul class="lista-presupuesto">${alertas.map(({ c, gastado, estado }) => `
          <li>
            <div class="fila-presupuesto"><span>${esc(c.icono)} ${esc(c.nombre)}</span><span>${clp(gastado)} de ${clp(c.tope_mensual)}</span></div>
            ${barraProgreso(gastado, c.tope_mensual, estado)}
            <small class="estado-texto" data-estado="${estado}">${ICONO_ESTADO[estado]}</small>
          </li>`).join('')}
        </ul>
      </section>` : ''}

    ${porPagar.length ? `
      <section class="tarjeta">
        <h2>Pagos fijos de ${esc(nombreMes(mes, false))}</h2>
        <ul class="lista">${porPagar.map(c => {
          const atrasado = c.dia_pago && c.dia_pago < hoy;
          return `<li class="fila fila-estatica">
            <span class="fila-texto"><b>${esc(c.nombre)}</b><small>${c.dia_pago ? `Vence el ${c.dia_pago}` : 'Sin día fijo'}${atrasado ? ' · <span class="etiqueta atrasado">Atrasado</span>' : ''}</small></span>
            <span class="monto">${clp(c.monto)}</span>
            <button class="boton pequeño" data-pagar="${c.id}">Pagado</button>
          </li>`;
        }).join('')}</ul>
      </section>` : ''}

    ${d.paraVariable > 0 ? `
      <section class="tarjeta">
        <h2>¿Vas al ritmo?</h2>
        <p class="ayuda">Si la línea azul pasa por arriba de la punteada, vas gastando más rápido de lo que alcanza.</p>
        ${graficoRitmo({ acumulado: acumuladoDiario(mes), presupuesto: d.paraVariable, totalDias: d.totalDias }).html}
      </section>` : ''}
  `;
}

export function montar(raiz, refrescar) {
  montarFilas(raiz, refrescar);
  raiz.querySelectorAll('[data-pagar]').forEach(b => b.addEventListener('click', () => {
    const c = datos.compromisos.find(x => x.id === b.dataset.pagar);
    ejecutar(() => guardar('compromisos', { ...c, pagados: [...(c.pagados || []), mesActual()] }), `${c.nombre}: marcado como pagado`, refrescar);
  }));
}
