export const titulo = 'Más';

const OPCIONES = [
  ['#/compromisos', '📅', 'Pagos fijos', 'Arriendo, cuentas y compras en cuotas: lo que debes mes a mes'],
  ['#/cobros', '🤝', 'Me deben', 'Lo que prestaste o pagaste por otros, y cuándo te lo devuelven'],
  ['#/beneficios', '🏷️', 'Descuentos de tus tarjetas', 'En qué tienes descuento hoy y el resto de la semana'],
  ['#/analisis', '📊', 'Gráficos', 'En qué se te va la plata y cómo vas este mes'],
  ['#/revision', '✅', 'Revisión del mes', 'El checklist de fin de mes: pagos, saldos y alertas'],
  ['#/ajustes', '⚙️', 'Ajustes', 'Tu ingreso, categorías, eventos y respaldos'],
];

export function render() {
  return `<ul class="lista menu">${OPCIONES.map(([href, icono, nombre, detalle]) => `
    <li><a class="fila" href="${href}">
      <span class="icono-cat" aria-hidden="true">${icono}</span>
      <span class="fila-texto"><b>${nombre}</b><small>${detalle}</small></span>
      <span aria-hidden="true">›</span>
    </a></li>`).join('')}
  </ul>`;
}
