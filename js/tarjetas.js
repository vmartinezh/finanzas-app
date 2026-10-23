// Mis tarjetas en 3D (Descuentos). Cada tipo de tarjeta se dibuja parecido a la
// real (forma, colores, acabado, arte), pero sin logos: el nombre del banco y el
// de la red van en texto. Se inclina siguiendo el dedo o el mouse, con un brillo
// que lo sigue (estilo "tilt card"), y queda quieta con "reducir movimiento".
//
// En el perfil cada tarjeta se guarda como 'banco' o 'banco:tipo' ('cmr:elite').
import { esc } from './util.js';
import { sinMovimiento } from './ui.js';
import { separarTarjeta } from './beneficios.js';

// ── Arte dibujado (SVG), para no copiar las fotos de las tarjetas ─────────────
// Un generador simple y fijo: la misma tarjeta siempre se ve igual.
function azar(semilla) {
  let s = semilla;
  return () => ((s = (s * 9301 + 49297) % 233280) / 233280);
}

function piedras({ fondo, tonos, brillo, semilla = 7 }) {
  const r = azar(semilla);
  let figuras = '';
  for (let i = 0; i < 22; i++) {
    const x = r() * 110 - 5, y = r() * 110 - 5, rx = 9 + r() * 10, ry = 6 + r() * 7, giro = r() * 180;
    const tono = tonos[i % tonos.length];
    figuras += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" transform="rotate(${giro.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${tono}" stroke="rgb(0 0 0 / .25)" stroke-width=".6"/>`
      + `<ellipse cx="${(x - rx / 4).toFixed(1)}" cy="${(y - ry / 3).toFixed(1)}" rx="${(rx / 2.4).toFixed(1)}" ry="${(ry / 3).toFixed(1)}" transform="rotate(${giro.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${brillo}"/>`;
  }
  return `<rect width="100" height="100" fill="${fondo}"/>${figuras}`;
}

function hojas({ fondo, hoja, vena, semilla = 3 }) {
  const r = azar(semilla);
  let figuras = '';
  for (let i = 0; i < 9; i++) {
    const x = r() * 100, y = r() * 100, largo = 22 + r() * 16, giro = r() * 360;
    figuras += `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${giro.toFixed(0)})">
      <path d="M0 0 C${(largo * .4).toFixed(1)} -${(largo * .45).toFixed(1)} ${(largo * .9).toFixed(1)} -${(largo * .3).toFixed(1)} ${largo.toFixed(1)} 0 C${(largo * .9).toFixed(1)} ${(largo * .3).toFixed(1)} ${(largo * .4).toFixed(1)} ${(largo * .45).toFixed(1)} 0 0Z" fill="${hoja}"/>
      <path d="M0 0 L${largo.toFixed(1)} 0 M${(largo * .3).toFixed(1)} 0 l5 -5 M${(largo * .3).toFixed(1)} 0 l5 5 M${(largo * .6).toFixed(1)} 0 l4 -4 M${(largo * .6).toFixed(1)} 0 l4 4" stroke="${vena}" stroke-width=".7" fill="none"/>
    </g>`;
  }
  return `<rect width="100" height="100" fill="${fondo}"/>${figuras}`;
}

function flor({ fondo, petalos, centro }) {
  let figuras = '';
  for (let i = 0; i < 9; i++) {
    figuras += `<ellipse cx="62" cy="40" rx="15" ry="42" transform="rotate(${i * 40} 62 58)" fill="${petalos[i % petalos.length]}" opacity=".85"/>`;
  }
  return `<rect width="100" height="100" fill="${fondo}"/>${figuras}<circle cx="62" cy="58" r="7" fill="${centro}"/>`;
}

function vetas({ fondo, colores, semilla = 5 }) {
  const r = azar(semilla);
  let figuras = '';
  for (let i = 0; i < 14; i++) {
    const y = i * 8 - 6, a = 6 + r() * 10;
    figuras += `<path d="M-5 ${y} C25 ${(y - a).toFixed(1)} 55 ${(y + a).toFixed(1)} 105 ${(y - a / 2).toFixed(1)} L105 ${y + 9} C55 ${(y + 9 + a).toFixed(1)} 25 ${(y + 9 - a).toFixed(1)} -5 ${y + 9}Z" fill="${colores[i % colores.length]}"/>`;
  }
  return `<rect width="100" height="100" fill="${fondo}"/>${figuras}`;
}

// ── Catálogo de tipos y su diseño ─────────────────────────────────────────────
// forma: 'vertical' | 'horizontal'. fondo: CSS. tinta: color del texto.
// arte: SVG que cubre la parte de arriba (Santander) o toda la tarjeta.
// banda: color de la franja inferior (Santander). borde: marco de color.
const PLATA = 'linear-gradient(135deg, #e9ecef, #b8bec4 45%, #f4f6f7 60%, #a9b0b6)';
const ORO = 'linear-gradient(135deg, #d9b45a, #a8812f 45%, #f0d48a 62%, #9c7428)';

export const TIPOS = {
  cmr: [
    { id: 'mastercard', nombre: 'Mastercard', forma: 'vertical', fondo: '#3db13b', tinta: '#fff', red: 'Mastercard' },
    { id: 'premium', nombre: 'Premium', forma: 'vertical', fondo: 'linear-gradient(160deg, #a7a7a7, #8d8d8d)', tinta: '#fff', red: 'Mastercard' },
    { id: 'elite', nombre: 'Elite', forma: 'vertical', fondo: 'linear-gradient(160deg, #1c1c1c, #050505)', tinta: '#fff', red: 'Mastercard' },
  ],
  santander: [
    { id: 'life', nombre: 'Life', forma: 'vertical', banda: '#e4e8ea', tinta: '#2a2a2a', borde: '#ec0000',
      arte: () => piedras({ fondo: '#b9bcc0', tonos: ['#9fa3a8', '#c9ccd0', '#8e9297', '#b1b5ba'], brillo: 'rgb(255 255 255 / .35)', semilla: 11 }) },
    { id: 'platinum', nombre: 'Platinum LATAM Pass', forma: 'vertical', banda: PLATA, tinta: '#2a2a2a',
      arte: () => hojas({ fondo: '#2b1a2e', hoja: '#5b3557', vena: '#d8a8cf', semilla: 4 }) },
    { id: 'gold', nombre: 'Gold LATAM Pass', forma: 'vertical', banda: ORO, tinta: '#3a2a10',
      arte: () => vetas({ fondo: '#6b4a2e', colores: ['#8a6440', '#c9b9a2', '#5d6b7a', '#a07850', '#e8dccb', '#3e3530'], semilla: 9 }) },
    { id: 'worldmember', nombre: 'WorldMember LATAM Pass', forma: 'vertical', banda: '#0d0d12', tinta: '#fff',
      arte: () => flor({ fondo: '#1b0f3a', petalos: ['#5b2bb5', '#7e3fd8', '#4a2196', '#9a5ce6'], centro: '#2a1060' }) },
    { id: 'limited', nombre: 'WorldMember Limited', forma: 'vertical', banda: '#0a0a0a', tinta: '#e6c27a', borde: '#c9a45c',
      arte: () => piedras({ fondo: '#0d0e10', tonos: ['#1d1f23', '#2a2d33', '#14161a', '#343840'], brillo: 'rgb(255 255 255 / .12)', semilla: 23 }) },
  ],
  'banco-de-chile': [
    { id: 'infinite', nombre: 'Visa Infinite', forma: 'vertical', tinta: '#e3c37a', red: 'VISA',
      fondo: 'repeating-linear-gradient(135deg, rgb(255 255 255 / .04) 0 2px, transparent 2px 5px), linear-gradient(160deg, #222, #090909)' },
    { id: 'signature', nombre: 'Visa Signature', forma: 'vertical', tinta: '#f2f2f2', red: 'VISA',
      fondo: 'repeating-linear-gradient(135deg, rgb(255 255 255 / .03) 0 2px, transparent 2px 5px), linear-gradient(160deg, #3a3d42, #16171a)' },
    { id: 'black', nombre: 'Mastercard Black', forma: 'horizontal', tinta: '#f2f2f2', red: 'Mastercard',
      fondo: 'linear-gradient(135deg, #2b2b2b, #0b0b0b 60%, #1d1d1d)' },
    { id: 'platinum', nombre: 'Visa Platinum', forma: 'vertical', fondo: PLATA, tinta: '#2f343a', red: 'VISA' },
    { id: 'fan', nombre: 'Visa Fan', forma: 'vertical', fondo: 'linear-gradient(160deg, #1a2f7a, #0e1b4d)', tinta: '#fff', red: 'VISA', fan: true },
    { id: 'universal', nombre: 'Mastercard Universal', forma: 'horizontal', tinta: '#fff', red: 'Mastercard',
      fondo: 'radial-gradient(circle at 70% 30%, #2d6a9a, transparent 60%), linear-gradient(135deg, #123a5c, #0a2238)' },
  ],
  bancoestado: [
    { id: 'smart', nombre: 'Visa SMART', forma: 'horizontal', tinta: '#fff', red: 'VISA',
      fondo: 'repeating-linear-gradient(120deg, rgb(255 255 255 / .08) 0 10px, transparent 10px 24px), linear-gradient(135deg, #ff7a00, #e85d04)' },
    { id: 'smart-plus', nombre: 'Visa SMART+', forma: 'horizontal', tinta: '#fff', red: 'VISA',
      fondo: 'repeating-linear-gradient(120deg, rgb(255 255 255 / .05) 0 10px, transparent 10px 24px), linear-gradient(135deg, #6d7075, #3c3f44)' },
    { id: 'platinum-convenio', nombre: 'Visa Platinum Convenio', forma: 'horizontal', fondo: PLATA, tinta: '#2f343a', red: 'VISA' },
    { id: 'universal', nombre: 'Visa Universal', forma: 'horizontal', tinta: '#fff', red: 'VISA',
      fondo: 'repeating-linear-gradient(90deg, rgb(255 255 255 / .06) 0 1px, transparent 1px 4px), linear-gradient(135deg, #8a9097, #5e646b)' },
    { id: 'dorada', nombre: 'Visa Dorada', forma: 'horizontal', fondo: ORO, tinta: '#3a2a10', red: 'VISA' },
    { id: 'black', nombre: 'Mastercard Black', forma: 'horizontal', tinta: '#e9eef0', red: 'Mastercard',
      fondo: 'linear-gradient(135deg, #17262a, #0a1214)' },
    { id: 'estandar', nombre: 'Mastercard Estándar', forma: 'horizontal', fondo: PLATA, tinta: '#2f343a', red: 'Mastercard' },
  ],
};

// Bancos sin tipos dibujados todavía: una tarjeta genérica en su color.
const GENERICAS = {
  cmr: 'linear-gradient(160deg, #3db13b, #2a8a28)',
  santander: 'linear-gradient(135deg, #ec0000, #a80000)',
  'banco-de-chile': 'linear-gradient(135deg, #1a2f7a, #0e1b4d)',
  bancoestado: 'linear-gradient(135deg, #ff7a00, #e85d04)',
  bci: 'linear-gradient(135deg, #1f2a44, #0e1526)',
  scotiabank: 'linear-gradient(135deg, #ec111a, #a30008)',
  cencosud: 'linear-gradient(135deg, #1f6fd1, #0d3f80)',
  ripley: 'linear-gradient(135deg, #5b2a86, #2f1150)',
  itau: 'linear-gradient(135deg, #ff7a00, #ec5b00)',
  'lider-bci': 'linear-gradient(135deg, #0071ce, #00468a)',
};

export const tipoDe = id => {
  const { banco, tipo } = separarTarjeta(id);
  return TIPOS[banco]?.find(t => t.id === tipo) ?? null;
};

const CHIP = `<svg class="t-chip" viewBox="0 0 30 22" aria-hidden="true"><rect width="30" height="22" rx="4"/>
  <path d="M0 8h9M0 14h9M21 8h9M21 14h9M9 0v22M21 0v22M9 11h12" stroke="rgb(0 0 0 / .28)" stroke-width="1" fill="none"/></svg>`;
const SIN_CONTACTO = `<svg class="t-sin-contacto" viewBox="0 0 16 20" aria-hidden="true"><path d="M3 4c3 3 3 9 0 12M7 2c4.5 4.5 4.5 11.5 0 16M11 0c6 6 6 14 0 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;

const artes = new Map();
const arteDe = (id, t) => {
  if (!artes.has(id)) artes.set(id, t.arte());
  return artes.get(id);
};

// La tarjeta dibujada. nombreBanco: como aparece en el catálogo ("CMR Falabella").
export function tarjetaHTML(id, nombreBanco, { chica = false } = {}) {
  const { banco } = separarTarjeta(id);
  const t = tipoDe(id) ?? { nombre: '', forma: 'horizontal', fondo: GENERICAS[banco] ?? 'linear-gradient(135deg, #3e9b4f, #183020)', tinta: '#fff' };
  const arte = t.arte ? `<svg class="t-arte" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${arteDe(id, t)}</svg>` : '';
  const conBanda = Boolean(t.banda);
  // En la tarjeta, el tipo sin la red que ya está escrita aparte: "Visa Infinite" → "Infinite".
  const tipoEnTarjeta = t.red ? t.nombre.replace(/^(?:Visa|Mastercard)\s*/i, '').trim() : t.nombre;
  return `<div class="tarjeta-3d${chica ? ' chica' : ''}" data-forma="${t.forma}" data-emisor="${esc(banco)}"${t.borde ? ` data-borde` : ''}
      style="--fondo: ${t.fondo ?? t.banda}; --tinta: ${t.tinta}; ${t.banda ? `--banda: ${t.banda};` : ''} ${t.borde ? `--borde: ${t.borde};` : ''}"
      role="img" aria-label="${esc(`${nombreBanco}${t.nombre ? ' ' + t.nombre : ''}`)}">
    <div class="t-cara">
      ${conBanda ? `<div class="t-arriba">${arte}</div><div class="t-banda"></div>` : arte}
      ${t.fan ? '<span class="t-fan" aria-hidden="true">FAN<br>FAN<br>FAN</span>' : ''}
      ${CHIP}${SIN_CONTACTO}
      <span class="t-banco">${esc(nombreBanco)}</span>
      ${tipoEnTarjeta ? `<span class="t-tipo">${esc(tipoEnTarjeta)}</span>` : ''}
      ${t.red ? `<span class="t-red">${esc(t.red)}</span>` : ''}
      <span class="t-brillo" aria-hidden="true"></span>
    </div>
  </div>`;
}

// Inclinación con el puntero: la tarjeta se aleja del dedo ("evade"), hasta 15°,
// se agranda un poco y el brillo sigue al puntero. Solo mientras se toca.
const INCLINACION = 15;
export function activarTarjetas3D(raiz) {
  if (sinMovimiento()) return;
  for (const tarjeta of raiz.querySelectorAll('.tarjeta-3d')) {
    const mover = e => {
      const caja = tarjeta.getBoundingClientRect();
      const x = (e.clientX - caja.left) / caja.width, y = (e.clientY - caja.top) / caja.height;
      tarjeta.style.setProperty('--rx', `${((0.5 - y) * -2 * INCLINACION).toFixed(1)}deg`);
      tarjeta.style.setProperty('--ry', `${((x - 0.5) * -2 * INCLINACION).toFixed(1)}deg`);
      tarjeta.style.setProperty('--mx', `${(x * 100).toFixed(0)}%`);
      tarjeta.style.setProperty('--my', `${(y * 100).toFixed(0)}%`);
      tarjeta.classList.add('activa');
    };
    const soltar = () => {
      tarjeta.classList.remove('activa');
      tarjeta.style.removeProperty('--rx');
      tarjeta.style.removeProperty('--ry');
    };
    tarjeta.addEventListener('pointermove', mover);
    tarjeta.addEventListener('pointerdown', mover);
    tarjeta.addEventListener('pointerleave', soltar);
    tarjeta.addEventListener('pointercancel', soltar);
    tarjeta.addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') soltar(); });
  }
}
