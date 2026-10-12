import { datos, guardar } from '../db.js';
import { disponibleDelMes, gastoPorCategoria, estadoPresupuesto } from '../calculos.js';
import { abrirFormulario, ejecutar, barraProgreso, ICONO_ESTADO } from '../ui.js';
import { clp, esc, mesActual, nombreMes } from '../util.js';

export const titulo = 'Presupuesto';

export function render() {
  const mes = mesActual();
  const d = disponibleDelMes(mes);
  const gastos = gastoPorCategoria(mes);
  const categorias = datos.categorias.filter(c => c.tipo !== 'ingreso').sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  const sumaTopes = categorias.reduce((s, c) => s + (c.tope_mensual || 0), 0);
  const sinCategoria = gastos.get('sin') || 0;
  const diferencia = d.paraVariable - sumaTopes;

  return `
    <section class="tarjeta">
      <h2>${esc(nombreMes(mes))}</h2>
      <dl class="resumen">
        <div><dt>Disponible para el día a día</dt><dd>${clp(d.paraVariable)}</dd></div>
        <div><dt>Suma de tus topes</dt><dd>${clp(sumaTopes)}</dd></div>
      </dl>
      ${sumaTopes === 0
        ? '<p class="ayuda">Toca una categoría para ponerle un tope mensual. No necesitas ponérselo a todas: parte por las 3 donde más se te va la plata.</p>'
        : diferencia < 0
          ? `<p class="mensaje alerta">⚠ Tus topes suman ${clp(-diferencia)} más de lo que tienes disponible. Baja alguno o no te va a alcanzar.</p>`
          : `<p class="mensaje ok">✓ Te sobran ${clp(diferencia)} sin asignar. Puedes dejarlos de colchón o abonar a una deuda.</p>`}
    </section>

    <section class="tarjeta">
      <h2>Por categoría</h2>
      <ul class="lista-presupuesto">
        ${categorias.map(c => {
          const gastado = gastos.get(c.id) || 0;
          const estado = estadoPresupuesto(gastado, c.tope_mensual);
          return `<li>
            <button class="fila-boton" data-cat="${c.id}">
              <div class="fila-presupuesto">
                <span>${esc(c.icono)} ${esc(c.nombre)}</span>
                <span>${clp(gastado)}${c.tope_mensual ? ` <small>de ${clp(c.tope_mensual)}</small>` : ' <small>sin tope</small>'}</span>
              </div>
              ${c.tope_mensual ? barraProgreso(gastado, c.tope_mensual, estado) : ''}
              ${ICONO_ESTADO[estado] ? `<small class="estado-texto" data-estado="${estado}">${ICONO_ESTADO[estado]}</small>` : ''}
            </button>
          </li>`;
        }).join('')}
        ${sinCategoria ? `<li><a class="fila-boton" href="#/movimientos"><div class="fila-presupuesto"><span>❔ Sin categoría</span><span>${clp(sinCategoria)}</span></div></a></li>` : ''}
      </ul>
    </section>
  `;
}

export function montar(raiz, refrescar) {
  raiz.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', async () => {
    const c = datos.categorias.find(x => x.id === b.dataset.cat);
    const v = await abrirFormulario({
      titulo: `${c.icono} ${c.nombre}`,
      campos: [{ nombre: 'tope_mensual', etiqueta: 'Tope mensual ($)', tipo: 'monto', valor: c.tope_mensual || '', ayuda: 'Déjalo vacío si no quieres tope para esta categoría.' }],
    });
    if (!v) return;
    ejecutar(() => guardar('categorias', { ...c, tope_mensual: Math.round(v.tope_mensual || 0) }), 'Tope guardado', refrescar);
  }));
}
