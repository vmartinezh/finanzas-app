import { datos, guardar, borrar } from '../db.js';
import { compromisosActivos, deudasVigentes } from '../calculos.js';
import { abrirFormulario, ejecutar } from '../ui.js';
import { clp, esc, mesActual, nombreMes, sumarMeses, hoyISO } from '../util.js';

export const titulo = 'Pagos fijos';

const cuotasQueQuedan = (c, mes) => {
  if (!c.hasta_mes) return null;
  const [a1, m1] = mes.split('-').map(Number);
  const [a2, m2] = c.hasta_mes.split('-').map(Number);
  return (a2 - a1) * 12 + (m2 - m1) + 1;
};

export function render() {
  const mes = mesActual();
  const hoy = Number(hoyISO().slice(8));
  const lista = datos.compromisos.slice().sort((a, b) => (a.dia_pago || 99) - (b.dia_pago || 99));
  const activos = compromisosActivos(mes);
  const cuotasDeudas = deudasVigentes().reduce((s, d) => s + (d.cuota_mensual || 0), 0);

  // Lo que ya tienes comprometido los próximos 6 meses.
  const proyeccion = Array.from({ length: 6 }, (_, i) => {
    const m = sumarMeses(mes, i);
    const fijos = compromisosActivos(m).reduce((s, c) => s + c.monto, 0);
    return { mes: m, fijos, total: fijos + cuotasDeudas };
  });

  return `
    <section class="tarjeta">
      <div class="titulo-con-accion"><h2>${esc(nombreMes(mes))}</h2><button class="boton pequeño" id="nuevo-compromiso">+ Agregar</button></div>
      <p class="ayuda">Arriendo, cuentas, suscripciones y compras en cuotas. Todo lo que pagas sí o sí cada mes.</p>
      ${lista.length ? `<ul class="lista">${lista.map(c => {
        const vigente = activos.includes(c);
        const pagado = (c.pagados || []).includes(mes);
        const atrasado = vigente && !pagado && c.dia_pago && c.dia_pago < hoy;
        const quedan = cuotasQueQuedan(c, mes);
        const estado = !vigente ? '<span class="etiqueta">Terminado</span>'
          : pagado ? '<span class="etiqueta pagada">✓ Pagado</span>'
          : atrasado ? '<span class="etiqueta atrasado">Atrasado</span>'
          : '<span class="etiqueta">Por pagar</span>';
        return `<li class="fila fila-estatica ${vigente ? '' : 'apagada'}">
          <button class="fila-texto fila-boton-texto" data-editar="${c.id}">
            <b>${esc(c.nombre)}</b>
            <small>${c.dia_pago ? `Día ${c.dia_pago}` : 'Sin día fijo'}${quedan > 0 ? ` · ${quedan === 1 ? 'última cuota' : `quedan ${quedan} cuotas`}` : ''} · ${estado}</small>
          </button>
          <span class="monto">${clp(c.monto)}</span>
          ${vigente ? `<button class="boton pequeño ${pagado ? 'secundario' : ''}" data-alternar="${c.id}">${pagado ? 'Deshacer' : 'Pagado'}</button>` : ''}
        </li>`;
      }).join('')}</ul>`
      : '<div class="vacio">Aún no tienes pagos fijos. Agrega el arriendo, las cuentas y las compras en cuotas.</div>'}
    </section>

    <section class="tarjeta">
      <h2>Lo que ya tienes comprometido</h2>
      <p class="ayuda">Pagos fijos + cuotas de deudas (${clp(cuotasDeudas)}/mes), antes de gastar un peso en el día a día.</p>
      <table class="tabla">
        <thead><tr><th>Mes</th><th>Pagos fijos</th><th>Total</th></tr></thead>
        <tbody>${proyeccion.map(p => `<tr><td>${esc(nombreMes(p.mes, false))}</td><td>${clp(p.fijos)}</td><td><b>${clp(p.total)}</b></td></tr>`).join('')}</tbody>
      </table>
      ${datos.perfil.ingreso_mensual ? `<p class="ayuda">Equivale al <b>${Math.round(proyeccion[0].total / datos.perfil.ingreso_mensual * 100)}%</b> de tu ingreso. Sobre 70% queda poco margen para imprevistos.</p>` : ''}
    </section>
  `;
}

async function editar(c, refrescar) {
  const nuevo = !c;
  c = c || { activo: true, pagados: [] };
  const mes = mesActual();
  const quedan = cuotasQueQuedan(c, mes);
  const v = await abrirFormulario({
    titulo: nuevo ? 'Nuevo pago fijo' : c.nombre,
    puedeBorrar: !nuevo,
    campos: [
      { nombre: 'nombre', etiqueta: 'Nombre', valor: c.nombre, requerido: true, placeholder: 'ej: Arriendo, TV en cuotas' },
      { nombre: 'monto', etiqueta: 'Monto mensual ($)', tipo: 'monto', valor: c.monto, requerido: true },
      { nombre: 'dia_pago', etiqueta: 'Día de pago', tipo: 'number', valor: c.dia_pago, placeholder: '1 a 31' },
      { nombre: 'cuotas', etiqueta: 'Cuotas que quedan (incluida la de este mes)', tipo: 'number', valor: quedan > 0 ? quedan : '', ayuda: 'Déjalo vacío si es un pago de todos los meses, como el arriendo.' },
      { nombre: 'categoria_id', etiqueta: 'Categoría', tipo: 'select', valor: c.categoria_id || '', opciones: [['', 'Sin categoría'], ...datos.categorias.filter(x => x.tipo !== 'ingreso').map(x => [x.id, `${x.icono} ${x.nombre}`])] },
      { nombre: 'activo', etiqueta: 'Activo', tipo: 'checkbox', valor: c.activo !== false },
    ],
  });
  if (!v) return;
  if (v === 'borrar') return ejecutar(() => borrar('compromisos', c.id), 'Pago fijo borrado', refrescar);
  const { cuotas, ...resto } = v;
  const fila = {
    ...c, ...resto,
    monto: Math.round(v.monto || 0),
    dia_pago: v.dia_pago ? Math.min(31, Math.max(1, Math.round(v.dia_pago))) : null,
    hasta_mes: cuotas > 0 ? sumarMeses(mes, Math.round(cuotas) - 1) : null,
  };
  ejecutar(() => guardar('compromisos', fila), 'Pago fijo guardado', refrescar);
}

export function montar(raiz, refrescar) {
  raiz.querySelector('#nuevo-compromiso').addEventListener('click', () => editar(null, refrescar));
  raiz.querySelectorAll('[data-editar]').forEach(b => b.addEventListener('click', () => editar(datos.compromisos.find(c => c.id === b.dataset.editar), refrescar)));
  raiz.querySelectorAll('[data-alternar]').forEach(b => b.addEventListener('click', () => {
    const c = datos.compromisos.find(x => x.id === b.dataset.alternar);
    const mes = mesActual();
    const pagados = c.pagados || [];
    const nuevos = pagados.includes(mes) ? pagados.filter(m => m !== mes) : [...pagados, mes];
    ejecutar(() => guardar('compromisos', { ...c, pagados: nuevos }), null, refrescar);
  }));
}
