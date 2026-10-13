import { iniciar, modo, enviarEnlaceAcceso } from './db.js';
import { sembrarCategorias, cargarEjemplo } from './semillas.js';
import { activarTooltips } from './graficos.js';
import { avisar } from './ui.js';
import { esc } from './util.js';
import { editarMovimiento } from './views/movimientos.js';

import * as inicio from './views/inicio.js';
import * as movimientos from './views/movimientos.js';
import * as presupuesto from './views/presupuesto.js';
import * as deudas from './views/deudas.js';
import * as compromisos from './views/compromisos.js';
import * as analisis from './views/analisis.js';
import * as ajustes from './views/ajustes.js';
import * as mas from './views/mas.js';
import * as revision from './views/revision.js';

// Cada vista exporta: titulo, render() → html, y opcionalmente montar(raiz, refrescar).
const RUTAS = { inicio, movimientos, presupuesto, deudas, compromisos, analisis, ajustes, mas, revision };
// Pantallas que viven dentro de "Más" (para marcar la pestaña correcta).
const DENTRO_DE_MAS = ['compromisos', 'analisis', 'ajustes', 'revision'];

const vista = document.getElementById('vista');

function rutaActual() {
  const nombre = location.hash.replace(/^#\/?/, '').split('?')[0];
  return RUTAS[nombre] ? nombre : 'inicio';
}

export function refrescar() {
  const nombre = rutaActual();
  const v = RUTAS[nombre];
  document.getElementById('titulo').textContent = v.titulo;
  document.title = nombre === 'inicio' ? 'Lucas' : `${v.titulo} · Lucas`;
  const pestaña = DENTRO_DE_MAS.includes(nombre) ? 'mas' : nombre;
  for (const a of document.querySelectorAll('.nav-inferior a')) {
    if (a.dataset.ruta === pestaña) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  try {
    vista.innerHTML = v.render();
    v.montar?.(vista, refrescar);
    activarTooltips(vista);
  } catch (e) {
    console.error(e);
    vista.innerHTML = `<div class="tarjeta error"><h2>Algo falló</h2><p>${esc(e.message)}</p></div>`;
  }
}

function pantallaAcceso() {
  document.body.classList.add('sin-sesion');
  vista.innerHTML = `
    <section class="tarjeta acceso">
      <h2>Entra a Lucas</h2>
      <p>Te mandamos un enlace a tu correo para entrar, sin contraseña.</p>
      <form id="form-acceso">
        <label class="campo"><span>Tu correo</span><input type="email" name="email" required autocomplete="email"></label>
        <button class="boton primario ancho">Enviarme el enlace</button>
      </form>
    </section>`;
  vista.querySelector('#form-acceso').addEventListener('submit', async e => {
    e.preventDefault();
    const email = e.target.email.value.trim();
    try {
      await enviarEnlaceAcceso(email);
      vista.querySelector('.acceso').innerHTML = `<h2>Revisa tu correo</h2><p>Mandamos un enlace a <b>${esc(email)}</b>. Ábrelo en este mismo dispositivo.</p>`;
    } catch (err) {
      avisar('No se pudo enviar: ' + err.message, 'error');
    }
  });
}

async function arrancar() {
  let usuario;
  try {
    usuario = await iniciar();
  } catch (e) {
    console.error(e);
    vista.innerHTML = `<div class="tarjeta error"><h2>No pudimos cargar tus datos</h2><p>${esc(e.message)}</p><p>Revisa tu conexión y vuelve a abrir la app.</p></div>`;
    return;
  }
  if (!usuario) return pantallaAcceso();

  const chip = document.getElementById('modo');
  chip.textContent = modo === 'local' ? 'En este dispositivo' : 'En la nube';
  chip.title = modo === 'local'
    ? 'Tus datos están guardados solo en este navegador. Haz respaldos en Más → Ajustes.'
    : 'Tus datos están guardados en tu cuenta.';

  await sembrarCategorias();
  if (new URLSearchParams(location.search).has('demo')) {
    await cargarEjemplo();
    history.replaceState(null, '', location.pathname + location.hash);
  }

  document.getElementById('boton-agregar').addEventListener('click', () => editarMovimiento(null, refrescar));
  window.addEventListener('hashchange', () => {
    refrescar();
    vista.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  });
  refrescar();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(e => console.warn('Sin modo offline', e));
  }
}

arrancar();
