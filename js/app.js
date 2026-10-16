import { iniciar, modo, crearCuenta, entrar, datos, recuperacion, pedirRecuperacion, cambiarContraseña } from './db.js';
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
import * as beneficios from './views/beneficios.js';
import * as cobros from './views/cobros.js';

// Cada vista exporta: titulo, render() → html, y opcionalmente montar(raiz, refrescar).
const RUTAS = { inicio, movimientos, presupuesto, deudas, compromisos, analisis, ajustes, mas, revision, beneficios, cobros };
// Pantallas que viven dentro de "Más" (para marcar la pestaña correcta).
const DENTRO_DE_MAS = ['compromisos', 'analisis', 'ajustes', 'revision', 'beneficios', 'cobros'];

const vista = document.getElementById('vista');

function rutaActual() {
  const nombre = location.hash.replace(/^#\/?/, '').split('?')[0];
  return RUTAS[nombre] ? nombre : 'inicio';
}

export function refrescar() {
  const nombre = rutaActual();
  const v = RUTAS[nombre];
  document.getElementById('titulo').textContent = v.titulo;
  document.title = nombre === 'inicio' ? 'Simplifica' : `${v.titulo} · Simplifica`;
  document.body.dataset.ruta = nombre;
  const pestaña = DENTRO_DE_MAS.includes(nombre) ? 'mas' : nombre;
  for (const a of document.querySelectorAll('.nav-inferior a, .boton-mas')) {
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

function pantallaAcceso(nueva = false) {
  document.body.classList.add('sin-sesion');
  document.getElementById('titulo').textContent = 'Simplifica';
  vista.innerHTML = `
    <section class="tarjeta acceso">
      <h2>${nueva ? 'Crea tu cuenta' : 'Entra a Simplifica'}</h2>
      <p class="ayuda">${nueva
        ? 'Tus datos quedan en tu cuenta y nadie más puede verlos.'
        : 'Tus cuentas, más simples. Tus días, más tranquilos.'}</p>
      <form id="form-acceso">
        <label class="campo"><span>Correo</span><input type="email" name="email" required autocomplete="email"></label>
        <label class="campo"><span>Contraseña</span>
          <input type="password" name="clave" required minlength="8" autocomplete="${nueva ? 'new-password' : 'current-password'}">
          ${nueva ? '<small>Al menos 8 caracteres.</small>' : ''}
        </label>
        <button class="boton primario ancho">${nueva ? 'Crear cuenta' : 'Entrar'}</button>
      </form>
      <p class="ayuda">${nueva ? '¿Ya tienes cuenta?' : '¿Primera vez?'} <a href="#" id="cambiar-acceso">${nueva ? 'Entrar' : 'Crear una cuenta'}</a></p>
      ${nueva ? '' : '<p class="ayuda"><a href="#" id="olvide">¿Olvidaste tu contraseña?</a></p>'}
    </section>`;
  vista.querySelector('#cambiar-acceso').addEventListener('click', e => {
    e.preventDefault();
    pantallaAcceso(!nueva);
  });
  vista.querySelector('#olvide')?.addEventListener('click', e => {
    e.preventDefault();
    pantallaRecuperar(vista.querySelector('[name=email]').value.trim());
  });
  vista.querySelector('#form-acceso').addEventListener('submit', async e => {
    e.preventDefault();
    const boton = e.target.querySelector('button');
    const email = e.target.email.value.trim();
    boton.disabled = true;
    try {
      if (nueva) {
        const lista = await crearCuenta(email, e.target.clave.value);
        if (!lista) {
          vista.querySelector('.acceso').innerHTML = `<h2>Confirma tu correo</h2><p>Mandamos un enlace a <b>${esc(email)}</b>. Ábrelo y después entra con tu contraseña.</p>`;
          return;
        }
      } else {
        await entrar(email, e.target.clave.value);
      }
      location.reload();
    } catch (err) {
      avisar(err.message, 'error');
      boton.disabled = false;
    }
  });
}

function pantallaRecuperar(email = '', aviso = '') {
  document.body.classList.add('sin-sesion');
  document.getElementById('titulo').textContent = 'Simplifica';
  vista.innerHTML = `
    <section class="tarjeta acceso">
      <h2>Recupera tu contraseña</h2>
      ${aviso ? `<p class="mensaje">${esc(aviso)}</p>` : ''}
      <p class="ayuda">Te mandamos un correo con un enlace para crear una contraseña nueva.</p>
      <form id="form-recuperar">
        <label class="campo"><span>Correo</span><input type="email" name="email" required autocomplete="email" value="${esc(email)}"></label>
        <button class="boton primario ancho">Enviar enlace</button>
      </form>
      <p class="ayuda"><a href="#" id="volver-acceso">Volver a entrar</a></p>
    </section>`;
  vista.querySelector('#volver-acceso').addEventListener('click', e => {
    e.preventDefault();
    pantallaAcceso();
  });
  vista.querySelector('#form-recuperar').addEventListener('submit', async e => {
    e.preventDefault();
    const boton = e.target.querySelector('button');
    const correo = e.target.email.value.trim();
    boton.disabled = true;
    try {
      await pedirRecuperacion(correo);
      vista.querySelector('.acceso').innerHTML = `<h2>Revisa tu correo</h2>
        <p>Si <b>${esc(correo)}</b> tiene una cuenta, te llegó un enlace para crear una contraseña nueva. Ábrelo en este mismo dispositivo.</p>
        <p class="ayuda">¿No llega? Revisa la carpeta de spam.</p>`;
    } catch (err) {
      avisar(err.message, 'error');
      boton.disabled = false;
    }
  });
}

// Se llega aquí desde el enlace del correo, que ya abrió la sesión.
function pantallaNuevaContraseña() {
  document.body.classList.add('sin-sesion');
  document.getElementById('titulo').textContent = 'Simplifica';
  vista.innerHTML = `
    <section class="tarjeta acceso">
      <h2>Crea tu contraseña nueva</h2>
      <form id="form-nueva">
        <label class="campo"><span>Contraseña nueva</span>
          <input type="password" name="clave" required minlength="8" autocomplete="new-password">
          <small>Al menos 8 caracteres.</small>
        </label>
        <button class="boton primario ancho">Guardar y entrar</button>
      </form>
    </section>`;
  vista.querySelector('#form-nueva').addEventListener('submit', async e => {
    e.preventDefault();
    const boton = e.target.querySelector('button');
    boton.disabled = true;
    try {
      await cambiarContraseña(e.target.clave.value);
      location.reload();
    } catch (err) {
      avisar(err.message, 'error');
      boton.disabled = false;
    }
  });
}

async function arrancar() {
  let usuario;
  try {
    usuario = await iniciar();
  } catch (e) {
    document.body.classList.replace('cargando', 'sin-sesion');
    console.error(e);
    vista.innerHTML = `<div class="tarjeta error"><h2>No pudimos cargar tus datos</h2><p>${esc(e.message)}</p><p>Revisa tu conexión y vuelve a abrir la app.</p></div>`;
    return;
  }
  document.body.classList.remove('cargando');
  if (recuperacion === 'vencida') return pantallaRecuperar('', 'Ese enlace ya venció o ya se usó. Pide uno nuevo.');
  if (!usuario) return pantallaAcceso();
  if (recuperacion === 'lista') return pantallaNuevaContraseña();

  const chip = document.getElementById('modo');
  chip.textContent = modo === 'local' ? 'En este dispositivo' : 'En la nube';
  chip.title = modo === 'local'
    ? 'Tus datos están guardados solo en este navegador. Haz respaldos en Más → Ajustes.'
    : 'Tus datos están guardados en tu cuenta.';

  await sembrarCategorias();
  // ?demo=1 carga datos ficticios, pero solo en una app vacía: un enlace
  // recibido nunca debe mezclar datos inventados con los reales de alguien.
  if (new URLSearchParams(location.search).has('demo')) {
    const vacia = !datos.movimientos.length && !datos.deudas.length && !datos.compromisos.length;
    if (vacia) await cargarEjemplo();
    else setTimeout(() => avisar('Ya tienes datos propios, así que no cargué el ejemplo.'), 300);
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
