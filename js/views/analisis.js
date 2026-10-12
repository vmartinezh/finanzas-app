import { datos } from '../db.js';
import { gastoPorCategoria, movimientosDelMes, acumuladoDiario, disponibleDelMes } from '../calculos.js';
import { graficoMeses, graficoRitmo } from '../graficos.js';
import { clp, esc, mesActual, nombreMes, sumarMeses } from '../util.js';

export const titulo = 'Gráficos';

let mesVisto = mesActual();
let sinEventos = false;

export function render() {
  const totales = gastoPorCategoria(mesVisto, { sinEventos });
  const filas = [...totales]
    .map(([id, total]) => {
      const c = datos.categorias.find(x => x.id === id);
      return { nombre: c ? `${c.icono} ${c.nombre}` : '❔ Sin categoría', total };
    })
    .sort((a, b) => b.total - a.total);
  const totalMes = filas.reduce((s, f) => s + f.total, 0);
  const max = filas[0]?.total || 1;

  const meses = Array.from({ length: 6 }, (_, i) => sumarMeses(mesVisto, i - 5)).map(m => {
    const gastos = movimientosDelMes(m).filter(x => x.tipo === 'gasto');
    const eventos = gastos.filter(x => x.evento_id).reduce((s, x) => s + x.monto, 0);
    return {
      etiqueta: nombreMes(m, false).slice(0, 3),
      titulo: nombreMes(m),
      normal: gastos.reduce((s, x) => s + x.monto, 0) - eventos,
      eventos,
    };
  });

  const porEvento = datos.eventos.map(e => ({
    e, total: datos.movimientos.filter(m => m.evento_id === e.id && m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0),
  })).filter(x => x.total > 0);

  const d = disponibleDelMes(mesVisto);

  return `
    <div class="selector-mes">
      <button class="boton-icono" data-mes="-1" aria-label="Mes anterior">‹</button>
      <h2>${esc(nombreMes(mesVisto))}</h2>
      <button class="boton-icono" data-mes="1" aria-label="Mes siguiente" ${mesVisto >= mesActual() ? 'disabled' : ''}>›</button>
    </div>

    <section class="tarjeta">
      <div class="titulo-con-accion">
        <h2>¿En qué se fue?</h2>
        <label class="interruptor"><input type="checkbox" id="sin-eventos" ${sinEventos ? 'checked' : ''}> Sin eventos</label>
      </div>
      <p class="ayuda">${clp(totalMes)} en gastos${sinEventos ? ', sin contar eventos' : ''}.</p>
      ${filas.length ? `<ul class="barras-h">${filas.map(f => `
        <li>
          <span class="barras-h-nombre">${esc(f.nombre)}</span>
          <span class="barras-h-pista"><span class="barras-h-barra" style="width:${(f.total / max) * 100}%"></span></span>
          <span class="barras-h-valor">${clp(f.total)} <small>${Math.round(f.total / totalMes * 100)}%</small></span>
        </li>`).join('')}</ul>`
      : '<div class="vacio">No hay gastos este mes.</div>'}
    </section>

    <section class="tarjeta">
      <h2>Últimos 6 meses</h2>
      <p class="ayuda">Los eventos (como el matrimonio) van aparte para que no te escondan cómo es un mes normal.</p>
      ${graficoMeses({ meses }).html}
      <details class="tabla-datos">
        <summary>Ver como tabla</summary>
        <table class="tabla">
          <thead><tr><th>Mes</th><th>Normal</th><th>Eventos</th></tr></thead>
          <tbody>${meses.map(m => `<tr><td>${esc(m.titulo)}</td><td>${clp(m.normal)}</td><td>${clp(m.eventos)}</td></tr>`).join('')}</tbody>
        </table>
      </details>
    </section>

    ${d.paraVariable > 0 ? `
    <section class="tarjeta">
      <h2>Ritmo de ${esc(nombreMes(mesVisto, false))}</h2>
      ${graficoRitmo({ acumulado: acumuladoDiario(mesVisto), presupuesto: d.paraVariable, totalDias: d.totalDias }).html}
    </section>` : ''}

    ${porEvento.length ? `
    <section class="tarjeta">
      <h2>Total por evento</h2>
      <ul class="lista">${porEvento.map(({ e, total }) => `<li class="fila fila-estatica"><span class="fila-texto"><b>${esc(e.nombre)}</b></span><span class="monto">${clp(total)}</span></li>`).join('')}</ul>
    </section>` : ''}
  `;
}

export function montar(raiz, refrescar) {
  raiz.querySelectorAll('[data-mes]').forEach(b => b.addEventListener('click', () => {
    mesVisto = sumarMeses(mesVisto, Number(b.dataset.mes));
    refrescar();
  }));
  raiz.querySelector('#sin-eventos').addEventListener('change', e => {
    sinEventos = e.target.checked;
    refrescar();
  });
}
