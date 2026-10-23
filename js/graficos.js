// Gráficos en SVG hecho a mano: sin librerías, livianos y con tooltip al pasar
// el dedo o el mouse. Colores en css/app.css (--serie-1, --serie-2, --referencia).
import { esc, clp, clpCorto, montosOcultos } from './util.js';
import { anunciarMontosOcultos } from './ui.js';

const ALTO = 220;
const MARGEN = { arriba: 16, derecha: 12, abajo: 28, izquierda: 56 };

function escalaBonita(max) {
  if (max <= 0) return [0, 1];
  const aproximado = max / 4;
  const paso = Math.pow(10, Math.floor(Math.log10(aproximado)));
  const bonito = [1, 2, 2.5, 5, 10].map(f => f * paso).find(v => v >= aproximado);
  return [0, bonito * 4];
}

function ejeY(ancho, max, alto = ALTO) {
  const lineas = [];
  for (let i = 0; i <= 4; i++) {
    const v = (max / 4) * i;
    const y = MARGEN.arriba + (alto - MARGEN.arriba - MARGEN.abajo) * (1 - i / 4);
    // Con el ojo cerrado quedan solo las líneas: cinco "$•••••" en fila no dicen nada.
    lineas.push(`<line class="grilla" x1="${MARGEN.izquierda}" x2="${ancho - MARGEN.derecha}" y1="${y}" y2="${y}"/>`
      + (montosOcultos() ? '' : `<text class="eje" x="${MARGEN.izquierda - 8}" y="${y + 4}" text-anchor="end">${esc(clpCorto(v))}</text>`));
  }
  return lineas.join('');
}

// Línea del gasto acumulado del mes vs. la línea recta "ritmo ideal".
export function graficoRitmo({ acumulado, presupuesto, totalDias, ancho = 360 }) {
  const [, maxY] = escalaBonita(Math.max(presupuesto, ...acumulado, 1));
  const x = d => MARGEN.izquierda + (ancho - MARGEN.izquierda - MARGEN.derecha) * ((d - 1) / Math.max(totalDias - 1, 1));
  const y = v => MARGEN.arriba + (ALTO - MARGEN.arriba - MARGEN.abajo) * (1 - v / maxY);

  const puntos = acumulado.map((v, i) => `${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const ultimo = acumulado.length;
  const etiquetasX = [1, Math.ceil(totalDias / 2), totalDias]
    .map(d => `<text class="eje" x="${x(d)}" y="${ALTO - 8}" text-anchor="middle">día ${d}</text>`).join('');

  const datosTooltip = acumulado.map((v, i) => ({
    titulo: `Día ${i + 1}`,
    filas: [['Gastado', clp(v)], ['Ritmo ideal', clp(presupuesto * (i + 1) / totalDias)]],
    x: x(i + 1), y: y(v),
  }));

  return {
    html: `<figure class="grafico" data-tooltip='${esc(JSON.stringify(datosTooltip))}'>
      <div class="leyenda">
        <span><i class="marca serie-1"></i>Gasto variable acumulado</span>
        <span><i class="marca referencia"></i>Ritmo ideal según presupuesto</span>
      </div>
      <svg viewBox="0 0 ${ancho} ${ALTO}" role="img" aria-label="Gasto acumulado del mes comparado con el ritmo ideal">
        ${ejeY(ancho, maxY)}
        ${etiquetasX}
        ${presupuesto > 0 ? `<line class="linea-referencia" x1="${x(1)}" y1="${y(presupuesto / totalDias)}" x2="${x(totalDias)}" y2="${y(presupuesto)}"/>` : ''}
        ${ultimo > 1 ? `<polyline class="linea serie-1" points="${puntos}"/>` : ''}
        ${ultimo ? `<circle class="punto serie-1" cx="${x(ultimo)}" cy="${y(acumulado[ultimo - 1])}" r="4.5"/>` : ''}
        <line class="cursor" x1="0" x2="0" y1="${MARGEN.arriba}" y2="${ALTO - MARGEN.abajo}" visibility="hidden"/>
        <rect class="zona-hover" x="${MARGEN.izquierda}" y="0" width="${ancho - MARGEN.izquierda - MARGEN.derecha}" height="${ALTO}"/>
      </svg>
      <div class="tooltip" hidden></div>
    </figure>`,
  };
}

// Barras apiladas por mes: gasto normal + gasto de eventos (matrimonio, viajes...).
export function graficoMeses({ meses, ancho = 360 }) {
  const [, maxY] = escalaBonita(Math.max(...meses.map(m => m.normal + m.eventos), 1));
  const anchoUtil = ancho - MARGEN.izquierda - MARGEN.derecha;
  const banda = anchoUtil / meses.length;
  const anchoBarra = Math.min(36, banda * 0.6);
  const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
  const y = v => MARGEN.arriba + altoUtil * (1 - v / maxY);
  const base = y(0);
  const GAP = 2;

  const barras = meses.map((m, i) => {
    const cx = MARGEN.izquierda + banda * (i + 0.5);
    const x0 = cx - anchoBarra / 2;
    const hNormal = base - y(m.normal);
    const hEventos = base - y(m.eventos);
    let svg = '';
    if (m.normal > 0) svg += barraRedondeada(x0, base - hNormal, anchoBarra, hNormal, 'serie-1', m.eventos <= 0);
    if (m.eventos > 0) svg += barraRedondeada(x0, base - hNormal - hEventos - (m.normal > 0 ? GAP : 0), anchoBarra, hEventos, 'serie-2', true);
    svg += `<text class="eje" x="${cx}" y="${ALTO - 8}" text-anchor="middle">${esc(m.etiqueta)}</text>`;
    return svg;
  }).join('');

  const datosTooltip = meses.map((m, i) => ({
    titulo: m.titulo,
    filas: [['Gasto normal', clp(m.normal)], ['Eventos', clp(m.eventos)], ['Total', clp(m.normal + m.eventos)]],
    x: MARGEN.izquierda + banda * (i + 0.5), y: y(m.normal + m.eventos), banda,
  }));

  return {
    html: `<figure class="grafico" data-tooltip='${esc(JSON.stringify(datosTooltip))}' data-modo="bandas">
      <div class="leyenda">
        <span><i class="marca serie-1"></i>Gasto normal</span>
        <span><i class="marca serie-2"></i>Eventos</span>
      </div>
      <svg viewBox="0 0 ${ancho} ${ALTO}" role="img" aria-label="Gasto por mes, separando eventos">
        ${ejeY(ancho, maxY)}
        ${barras}
        <rect class="zona-hover" x="${MARGEN.izquierda}" y="0" width="${anchoUtil}" height="${ALTO}"/>
      </svg>
      <div class="tooltip" hidden></div>
    </figure>`,
  };
}

// Rectángulo con las esquinas de arriba redondeadas (4px) y la base recta.
function barraRedondeada(x, y, w, h, clase, redondear) {
  if (h <= 0) return '';
  const r = redondear ? Math.min(4, h, w / 2) : 0;
  return `<path class="barra ${clase}" d="M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z"/>`;
}

// Activa el tooltip de todos los gráficos dentro de `raiz`.
export function activarTooltips(raiz) {
  for (const fig of raiz.querySelectorAll('figure.grafico[data-tooltip]')) {
    const puntos = JSON.parse(fig.dataset.tooltip);
    const svg = fig.querySelector('svg');
    const zona = fig.querySelector('.zona-hover');
    const tip = fig.querySelector('.tooltip');
    const cursor = fig.querySelector('.cursor');
    if (!puntos.length) continue;

    const mostrar = evento => {
      const caja = svg.getBoundingClientRect();
      const escala = svg.viewBox.baseVal.width / caja.width;
      const xSvg = (evento.clientX - caja.left) * escala;
      const p = puntos.reduce((a, b) => Math.abs(b.x - xSvg) < Math.abs(a.x - xSvg) ? b : a);
      tip.innerHTML = `<strong>${esc(p.titulo)}</strong>` + p.filas.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
      anunciarMontosOcultos(tip);
      tip.hidden = false;
      const izquierda = Math.min(Math.max(p.x / escala - tip.offsetWidth / 2, 0), caja.width - tip.offsetWidth);
      tip.style.left = izquierda + 'px';
      tip.style.top = Math.max(p.y / escala - tip.offsetHeight - 12, 0) + 'px';
      if (cursor) {
        cursor.setAttribute('x1', p.x);
        cursor.setAttribute('x2', p.x);
        cursor.setAttribute('visibility', 'visible');
      }
    };
    const ocultar = () => {
      tip.hidden = true;
      if (cursor) cursor.setAttribute('visibility', 'hidden');
    };
    zona.addEventListener('pointermove', mostrar);
    zona.addEventListener('pointerdown', mostrar);
    zona.addEventListener('pointerleave', ocultar);
  }
}
