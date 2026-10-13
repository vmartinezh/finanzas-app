const formatoCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const formatoNumero = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

export const clp = n => formatoCLP.format(Math.round(n || 0));
export const numero = n => formatoNumero.format(Math.round(n || 0));

// Montos abreviados para ejes de gráficos: $1,2 M, $350 mil.
export function clpCorto(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return '$' + (n / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 1 }) + ' M';
  if (a >= 1e3) return '$' + numero(n / 1e3) + ' mil';
  return clp(n);
}

// Acepta "12.990", "$12990", "12 990" → 12990
export function leerMonto(texto) {
  const limpio = String(texto ?? '').replace(/[^\d,-]/g, '').replace(',', '.');
  const n = Math.round(parseFloat(limpio));
  return Number.isFinite(n) ? n : 0;
}

export function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Fechas como texto 'YYYY-MM-DD' en hora local, para evitar saltos por zona horaria.
export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const mesDe = fechaISO => fechaISO.slice(0, 7);
export const mesActual = () => mesDe(hoyISO());

export function sumarMeses(mes, n) {
  const [a, m] = mes.split('-').map(Number);
  const d = new Date(a, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function diasDelMes(mes) {
  const [a, m] = mes.split('-').map(Number);
  return new Date(a, m, 0).getDate();
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function nombreMes(mes, conAnio = true) {
  const [a, m] = mes.split('-').map(Number);
  return MESES[m - 1] + (conAnio ? ' ' + a : '');
}

export function fechaCorta(fechaISO) {
  const [, m, d] = fechaISO.split('-').map(Number);
  return `${d} ${MESES[m - 1].slice(0, 3)}`;
}

// Minúsculas y sin tildes. El rango del replace son las marcas de acento
// combinables (U+0300 a U+036F) que deja normalize('NFD').
export const normalizar = texto => String(texto ?? '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .trim();

// Porcentajes con un decimal si lo tienen: 32,5% · 45%
export const porcentaje = n => (n || 0).toLocaleString('es-CL', { maximumFractionDigits: 1 }) + '%';
