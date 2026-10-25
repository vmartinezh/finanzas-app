// Ajustes → "Compras con Apple Pay" (fase 2). En el iPhone, la automatización
// de Atajos "Transacción" corre cada vez que pagas con Wallet y le manda el
// comercio y el monto a la función recibir-compra, con una clave propia (no la
// del correo: renovar una no apaga la otra).
import { modo, estadoClaveIngreso, crearClaveIngreso, borrarClaveIngreso } from './db.js';
import { SUPABASE_URL, COMPRAS_SOLAS } from './config.js';
import { avisar, confirmar } from './ui.js';
import { esc, fechaCorta, hoyISO } from './util.js';

const URL_FUNCION = `${SUPABASE_URL}/functions/v1/recibir-compra`;

const haceCuanto = iso => {
  const dia = new Date(iso).toLocaleDateString('sv-SE');
  return dia === hoyISO() ? 'hoy' : `el ${fechaCorta(dia)}`;
};

function pasosHTML() {
  return `
    <ol class="pasos">
      <li>En tu iPhone abre <b>Atajos</b> → <b>Automatización</b> → <b>+</b>.</li>
      <li>Elige <b>Transacción</b>, marca tus tarjetas, elige <b>Ejecutar inmediatamente</b> y toca <b>Siguiente</b>.</li>
      <li>Toca <b>Nueva automatización en blanco</b> y agrega la acción <b>Obtener contenido de URL</b>.</li>
      <li>En la URL pega la dirección: <button class="boton pequeño" data-copiar="url">Copiar la dirección</button></li>
      <li>Toca la flecha de la acción: en <b>Método</b> elige <b>POST</b> y en <b>Cuerpo de la solicitud</b>, <b>JSON</b>. Agrega tres campos de texto:
        <ul class="pasos-campos">
          <li><code>clave</code>: pega tu clave <button class="boton pequeño" data-copiar="clave">Copiar la clave</button></li>
          <li><code>comercio</code>: elige la variable <b>Entrada del atajo</b> y luego <b>Comercio</b></li>
          <li><code>monto</code>: <b>Entrada del atajo</b> y luego <b>Monto</b> (o <b>Importe</b>)</li>
        </ul>
      </li>
      <li>Toca <b>OK</b>. La próxima vez que pagues con el iPhone o el reloj, la compra aparece en "Por revisar".</li>
    </ol>
    <p class="nota">La clave es solo para ese Atajo: no la compartas. Si la pierdes, crea una nueva aquí y la anterior deja de funcionar.</p>`;
}

export function walletHTML() {
  if (!COMPRAS_SOLAS) return '';
  return `<section class="tarjeta" id="wallet-gastos">
    <h2>Compras con Apple Pay</h2>
    <p class="ayuda">Si pagas con el iPhone o el Apple Watch, la compra llega sola a "Por revisar". Lo hace un Atajo en tu iPhone (iOS 17 o más): Simplifika solo recibe el comercio y el monto. Las compras con la tarjeta física no pasan por aquí.</p>
    <div id="wallet-estado">${modo === 'nube' ? '<p class="nota">Revisando…</p>'
      : '<p class="nota">Necesitas usar la app con cuenta (en la nube): las compras llegan a tu cuenta, no a este navegador.</p>'}</div>
  </section>`;
}

export async function montarWallet(raiz) {
  const caja = raiz.querySelector('#wallet-estado');
  if (modo !== 'nube' || !caja) return;
  // La clave vive solo en memoria y mientras estés en Ajustes: en la base queda su hash.
  let claveLista = null;

  const pintar = async () => {
    let estado;
    try { estado = await estadoClaveIngreso('wallet'); } catch (e) {
      caja.innerHTML = `<p class="nota">No pude revisar la conexión: ${esc(e.message)}</p>`;
      return;
    }
    if (!caja.isConnected) return;
    if (!estado) {
      claveLista = null;
      caja.innerHTML = '<button class="boton primario" id="conectar-wallet">Crear mi clave para el Atajo</button>';
      return;
    }
    caja.innerHTML = `
      <p>Clave creada ${haceCuanto(estado.creada)}. ${estado.ultimo_uso ? `Última compra recibida ${haceCuanto(estado.ultimo_uso)}.` : 'Todavía no llega ninguna compra.'}</p>
      ${claveLista ? pasosHTML() : ''}
      <div class="botones">
        <button class="boton secundario" id="renovar-wallet">Crear una clave nueva</button>
        <button class="boton peligro" id="desconectar-wallet">Desconectar</button>
      </div>`;
  };

  caja.addEventListener('click', async e => {
    const boton = e.target.closest('button');
    if (!boton) return;
    if (boton.id === 'conectar-wallet' || boton.id === 'renovar-wallet') {
      if (boton.id === 'renovar-wallet' && !(await confirmar('La clave anterior deja de funcionar: tendrás que pegar la nueva en el Atajo. ¿Seguir?'))) return;
      boton.disabled = true;
      try {
        claveLista = await crearClaveIngreso('wallet');
      } catch (err) {
        avisar('No se pudo crear la clave: ' + err.message, 'error');
      }
      await pintar();
    }
    if (boton.dataset.copiar) {
      const texto = boton.dataset.copiar === 'url' ? URL_FUNCION : claveLista;
      try {
        await navigator.clipboard.writeText(texto);
        avisar(boton.dataset.copiar === 'url' ? 'Dirección copiada.' : 'Clave copiada.');
      } catch {
        avisar('No pude copiarla. Prueba de nuevo desde el navegador.', 'error');
      }
    }
    if (boton.id === 'desconectar-wallet') {
      if (!(await confirmar('Tus pagos con Apple Pay dejarán de llegar solos. Lo que ya llegó se queda. ¿Desconectar?'))) return;
      try {
        await borrarClaveIngreso('wallet');
        claveLista = null;
        avisar('Desconectado. Si quieres, borra también la automatización en Atajos.');
      } catch (err) {
        avisar('No se pudo desconectar: ' + err.message, 'error');
      }
      await pintar();
    }
  });

  await pintar();
}
