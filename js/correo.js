// Ajustes → "Gastos desde tu correo" (fase 2). La persona conecta su Gmail con
// un script de Google que corre en su propia cuenta (correo/simplifika.gs) y le
// manda sus avisos de compra a la función recibir-compra.
import { modo, estadoClaveIngreso, crearClaveIngreso, borrarClaveIngreso } from './db.js';
import { SUPABASE_URL, GASTOS_POR_CORREO } from './config.js';
import { DOMINIOS_BANCOS } from '../supabase/functions/recibir-compra/lectores.js';
import { avisar, confirmar } from './ui.js';
import { esc, fechaCorta, hoyISO } from './util.js';

// El script con la clave vive solo en memoria y solo en esta visita: la clave
// no se guarda en ninguna parte (en la base queda su hash).
let scriptListo = null;

// Primero se trae la plantilla y recién después se crea la clave: si no hay
// conexión, la clave anterior sigue funcionando.
async function cargarPlantilla() {
  const respuesta = await fetch('correo/simplifika.gs', { cache: 'no-store' });
  const texto = respuesta.ok ? await respuesta.text() : '';
  if (!texto.includes('{{CLAVE}}')) throw new Error('no pude traer el script; revisa tu conexión');
  return texto;
}

const rellenar = (plantilla, clave) => plantilla
  .replace('{{URL}}', `${SUPABASE_URL}/functions/v1/recibir-compra`)
  .replace('{{CLAVE}}', clave)
  .replace('{{DOMINIOS}}', JSON.stringify(DOMINIOS_BANCOS));

// La base guarda la hora en UTC: se pasa al día local antes de compararla con hoy.
const haceCuanto = iso => {
  const dia = new Date(iso).toLocaleDateString('sv-SE');
  return dia === hoyISO() ? 'hoy' : `el ${fechaCorta(dia)}`;
};

function pasosHTML() {
  return `
    <ol class="pasos">
      <li><button class="boton primario" id="copiar-script">Copiar el script</button></li>
      <li>Abre <a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener">script.google.com</a> con tu cuenta de Gmail, borra lo que trae y pega el script.</li>
      <li>Arriba, elige <b>instalar</b> y toca <b>Ejecutar</b>. Google te pedirá permiso para leer tu Gmail: dice "no verificado" porque es tu propio script.</li>
    </ol>
    <p class="nota">El script lleva tu clave: no lo compartas. Si lo pierdes, crea una clave nueva aquí y la anterior deja de funcionar.</p>`;
}

export function correoHTML() {
  if (!GASTOS_POR_CORREO) return '';
  return `<section class="tarjeta" id="correo-gastos">
    <h2>Gastos desde tu correo</h2>
    <p class="ayuda">Tus compras con tarjeta llegan solas como "por revisar", desde los avisos de compra de tu banco. Un pequeño script en <b>tu propia cuenta de Google</b> los lee: nadie más ve tus correos.</p>
    <div id="correo-estado">${modo === 'nube' ? '<p class="nota">Revisando…</p>'
      : '<p class="nota">Necesitas usar la app con cuenta (en la nube): los gastos llegan a tu cuenta, no a este navegador.</p>'}</div>
  </section>`;
}

export async function montarCorreo(raiz) {
  const caja = raiz.querySelector('#correo-estado');
  if (modo !== 'nube' || !caja) return;

  const pintar = async () => {
    let estado;
    try { estado = await estadoClaveIngreso(); } catch (e) {
      caja.innerHTML = `<p class="nota">No pude revisar la conexión: ${esc(e.message)}</p>`;
      return;
    }
    if (!caja.isConnected) return;
    if (!estado) {
      scriptListo = null;
      caja.innerHTML = '<button class="boton primario" id="conectar-correo">Conectar mi correo</button>';
      return;
    }
    caja.innerHTML = `
      <p>Conectado ${haceCuanto(estado.creada)}. ${estado.ultimo_uso ? `Último aviso recibido ${haceCuanto(estado.ultimo_uso)}.` : 'Todavía no llega ningún aviso.'}</p>
      ${scriptListo ? pasosHTML() : ''}
      <div class="botones">
        <button class="boton secundario" id="renovar-correo">Crear una clave nueva</button>
        <button class="boton peligro" id="desconectar-correo">Desconectar</button>
      </div>`;
  };

  caja.addEventListener('click', async e => {
    const boton = e.target.closest('button');
    if (!boton) return;
    if (boton.id === 'conectar-correo' || boton.id === 'renovar-correo') {
      if (boton.id === 'renovar-correo' && !(await confirmar('La clave anterior deja de funcionar: tendrás que pegar el script de nuevo en Google. ¿Seguir?'))) return;
      boton.disabled = true;
      try {
        const plantilla = await cargarPlantilla();
        scriptListo = rellenar(plantilla, await crearClaveIngreso());
      } catch (err) {
        avisar('No se pudo crear la clave: ' + err.message, 'error');
      }
      await pintar();
    }
    if (boton.id === 'copiar-script') {
      try {
        await navigator.clipboard.writeText(scriptListo);
        avisar('Script copiado. Ahora pégalo en script.google.com.');
      } catch {
        avisar('No pude copiarlo. Prueba de nuevo desde el navegador.', 'error');
      }
    }
    if (boton.id === 'desconectar-correo') {
      if (!(await confirmar('Tus compras dejarán de llegar solas. Lo que ya llegó se queda. ¿Desconectar?'))) return;
      try {
        await borrarClaveIngreso();
        scriptListo = null;
        avisar('Desconectado. Si quieres, borra también el activador en script.google.com.');
      } catch (err) {
        avisar('No se pudo desconectar: ' + err.message, 'error');
      }
      await pintar();
    }
  });

  await pintar();
}
