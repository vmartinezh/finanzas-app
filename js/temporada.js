// Decoraciones de temporada: en ciertas fechas el logo se pone un gorro (Navidad,
// y más adelante otras fiestas). Cada gorro es un SVG en icons/gorros/ dibujado
// en las mismas coordenadas que icons/icon.svg, así que va justo encima del logo.
// Solo adorna el logo dentro de la app: el ícono de la pantalla de inicio queda
// fijo al instalar la app y el navegador no deja cambiarlo.
import { hoyISO } from './util.js';

// Fechas en 'MM-DD', ambas incluidas. Si "desde" es mayor que "hasta", la
// temporada cruza el año nuevo (por ejemplo, del 20 de diciembre al 6 de enero).
export const TEMPORADAS = [
  { id: 'navidad', desde: '12-01', hasta: '12-31' },
];

// La temporada de una fecha 'AAAA-MM-DD', o null si no hay ninguna.
export function temporadaDe(fecha, temporadas = TEMPORADAS) {
  const dia = String(fecha ?? '').slice(5, 10);
  if (!/^\d\d-\d\d$/.test(dia)) return null;
  const t = temporadas.find(({ desde, hasta }) =>
    desde <= hasta ? dia >= desde && dia <= hasta : dia >= desde || dia <= hasta);
  return t ? t.id : null;
}

// La de hoy. Para verla antes de tiempo: ?temporada=navidad (o =ninguna para sacarla).
export function temporadaActual() {
  const pedida = new URLSearchParams(location.search).get('temporada');
  if (pedida === 'ninguna') return null;
  if (TEMPORADAS.some(t => t.id === pedida)) return pedida;
  return temporadaDe(hoyISO());
}

// Le pone el gorro al logo de la barra de arriba y al de la pantalla de carga.
export function decorarLogo(temporada = temporadaActual()) {
  if (!temporada) return;
  const gorro = `icons/gorros/${temporada}.svg`;
  const logo = document.querySelector('.logo');
  if (logo && !logo.querySelector('.logo-gorro')) {
    const img = document.createElement('img');
    img.className = 'logo-gorro';
    img.src = gorro;
    img.alt = '';
    img.width = img.height = 32;
    logo.append(img);
  }
  // En la pantalla de carga va dentro del globo, para que aparezca y salte con él.
  const globo = document.querySelector('#carga .globo');
  if (globo && !globo.querySelector('.gorro-carga')) {
    const imagen = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    imagen.setAttribute('class', 'gorro-carga');
    imagen.setAttribute('href', gorro);
    imagen.setAttribute('width', '512');
    imagen.setAttribute('height', '512');
    globo.append(imagen);
  }
}
