import { esc, clp, numero, leerMonto, formatearMontoEscrito, MAX_DIGITOS_MONTO, conMontosVisibles, montosOcultos, MONTO_OCULTO } from './util.js';

const dialogo = () => document.getElementById('dialogo');

// "Reducir movimiento" del sistema: sin desplazamientos ni conteos, solo fundidos.
const reducirMovimiento = matchMedia('(prefers-reduced-motion: reduce)');
export const sinMovimiento = () => reducirMovimiento.matches;

// Campos de monto (data-monto): el punto de miles aparece mientras escribes y el
// cursor se queda después del mismo dígito. Un solo listener para toda la app.
// Un campo de monto. Vacío si no hay valor; si no, con punto de miles.
export function inputMonto({ nombre, valor, placeholder = '0', id = '', requerido = false }) {
  const texto = valor === '' || valor === null || valor === undefined ? '' : numero(valor);
  return `<input ${id ? `id="${id}"` : ''} name="${nombre}" type="text" inputmode="numeric" autocomplete="off" data-monto value="${esc(texto)}" placeholder="${esc(placeholder)}" ${requerido ? 'required' : ''}>`;
}

// Deja el valor formateado y el cursor después del mismo dígito en que estaba.
function formatearCampo(el, valor, digitosAntes) {
  el.value = valor;
  let pos = 0;
  for (let vistos = 0; pos < valor.length && vistos < digitosAntes; pos++) {
    if (/\d/.test(valor[pos])) vistos++;
  }
  el.setSelectionRange(pos, pos);
  el.dataset.previo = valor;
}

export function activarCamposMonto() {
  // Borrar justo al lado de un punto borra el dígito vecino (el punto solo se
  // volvería a poner). Se hace a mano: no todos los navegadores respetan un
  // cambio de selección en medio del borrado.
  document.addEventListener('beforeinput', e => {
    const el = e.target;
    if (!el.matches?.('[data-monto]') || el.selectionStart !== el.selectionEnd) return;
    const pos = el.selectionStart;
    const atras = e.inputType === 'deleteContentBackward' && el.value[pos - 1] === '.';
    const adelante = e.inputType === 'deleteContentForward' && el.value[pos] === '.';
    if (!atras && !adelante) return;
    e.preventDefault();
    const quitar = atras ? pos - 2 : pos + 1;
    if (quitar < 0 || quitar >= el.value.length) return;
    const sinDigito = el.value.slice(0, quitar) + el.value.slice(quitar + 1);
    const digitosAntes = sinDigito.slice(0, atras ? quitar : pos).replace(/\D/g, '').length;
    formatearCampo(el, formatearMontoEscrito(sinDigito), digitosAntes);
  });
  const alEscribir = e => {
    const el = e.target;
    if (!el.matches?.('[data-monto]') || e.isComposing) return;
    const digitos = el.value.replace(/\D/g, '');
    // Más dígitos que el tope: no se acepta la tecla (no se corta otro dígito en silencio).
    if (digitos.length > MAX_DIGITOS_MONTO && !/,\d{1,2}\s*$/.test(el.value)) {
      const previo = el.dataset.previo ?? '';
      formatearCampo(el, previo, previo.slice(0, Math.max(0, (el.selectionStart ?? 1) - 1)).replace(/\D/g, '').length);
      return;
    }
    // Los ceros a la izquierda se borran: no cuentan para ubicar el cursor.
    const antes = el.value.slice(0, el.selectionStart ?? el.value.length).replace(/\D/g, '').length;
    const ceros = Math.min(digitos.match(/^0+(?=\d)/)?.[0].length ?? 0, antes);
    formatearCampo(el, formatearMontoEscrito(el.value), antes - ceros);
  };
  document.addEventListener('input', alEscribir);
  // Teclados con composición (Android): se formatea al terminar de componer.
  document.addEventListener('compositionend', alEscribir);
}

// El número cuenta desde el valor anterior hasta el nuevo, frenando al final:
// así se ve que el gasto se descontó o que la plata entró.
export function contarHasta(el, desde, hasta, duracion = 650) {
  const inicio = performance.now();
  const paso = ahora => {
    if (!el.isConnected) return;
    const t = Math.min(1, (ahora - inicio) / duracion);
    const avance = 1 - Math.pow(2, -10 * t);
    el.textContent = clp(desde + (hasta - desde) * (t === 1 ? 1 : avance));
    if (t < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

// Con el ojo cerrado, un lector de pantalla diría "dólar punto punto…":
// cada monto oculto pasa a leerse como "monto oculto".
export function anunciarMontosOcultos(raiz) {
  if (!montosOcultos()) return;
  const recorrido = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
    acceptNode: n => n.data.includes(MONTO_OCULTO) && !n.parentElement.closest('svg, option, textarea, .monto-oculto')
      ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
  });
  const nodos = [];
  while (recorrido.nextNode()) nodos.push(recorrido.currentNode);
  for (const nodo of nodos) {
    const partes = nodo.data.split(MONTO_OCULTO);
    const fragmento = document.createDocumentFragment();
    partes.forEach((texto, i) => {
      if (i > 0) {
        const span = document.createElement('span');
        span.className = 'monto-oculto';
        // Los puntos van aparte para poder achicarlos en el número grande de Inicio.
        span.innerHTML = `<span aria-hidden="true">${MONTO_OCULTO[0]}<span class="puntos">${MONTO_OCULTO.slice(1)}</span></span><span class="sr-only">monto oculto</span>`;
        fragmento.append(span);
      }
      if (texto) fragmento.append(texto);
    });
    nodo.replaceWith(fragmento);
  }
}

// Abre un formulario en un diálogo y devuelve los valores, null si se cancela,
// o 'borrar' si se apretó el botón de borrar.
//   campos: [{ nombre, etiqueta, tipo: 'text'|'monto'|'number'|'date'|'select'|'textarea'|'checkbox',
//              valor, opciones: [[valor, texto]], requerido, ayuda, placeholder,
//              sugerencias: [texto] (para elegir o escribir), min, max }]
//   vistaPrevia(valores) → texto que se actualiza mientras se escribe ("$25.000 cada uno").
export function abrirFormulario({ titulo, campos, textoGuardar = 'Guardar', puedeBorrar = false, intro = '', vistaPrevia = null }) {
  const dlg = dialogo();
  const form = document.getElementById('dialogo-form');
  form.innerHTML = `
    <h2>${esc(titulo)}</h2>
    ${intro ? `<p class="intro">${intro}</p>` : ''}
    ${campos.map(campoHTML).join('')}
    ${vistaPrevia ? '<p class="vista-previa" aria-live="polite"></p>' : ''}
    <div class="acciones">
      ${puedeBorrar ? '<button value="borrar" class="boton peligro" formnovalidate>Borrar</button>' : ''}
      <span class="espacio"></span>
      <button value="cancelar" class="boton secundario" formnovalidate>Cancelar</button>
      <button value="guardar" class="boton primario">${esc(textoGuardar)}</button>
    </div>`;
  anunciarMontosOcultos(form);

  const leerValores = () => {
    const valores = {};
    for (const c of campos) {
      const el = form.elements[c.nombre];
      if (c.tipo === 'checkbox') valores[c.nombre] = el.checked;
      else if (c.tipo === 'monto') valores[c.nombre] = el.value === '' ? null : Math.max(0, leerMonto(el.value));
      else if (c.tipo === 'number') valores[c.nombre] = el.value === '' ? null : Number(String(el.value).replace(',', '.'));
      else valores[c.nombre] = el.value === '' ? null : el.value;
    }
    return valores;
  };
  const previa = form.querySelector('.vista-previa');
  const actualizarPrevia = () => { previa.textContent = conMontosVisibles(() => vistaPrevia(leerValores())) || ''; };
  if (previa) actualizarPrevia();

  return new Promise(resolve => {
    // Se responde al enviar el formulario (botones) o al cerrar con Esc / atrás.
    const terminar = resultado => {
      form.removeEventListener('submit', alEnviar);
      if (previa) form.removeEventListener('input', actualizarPrevia);
      dlg.removeEventListener('close', alCerrar);
      if (dlg.open) dlg.close();
      resolve(resultado);
    };
    // El evento close llega con retraso: si el diálogo ya se volvió a abrir
    // para otro formulario, ese close es del anterior y se ignora.
    const alCerrar = () => { if (!dlg.open) terminar(null); };
    const alEnviar = e => {
      e.preventDefault();
      const accion = e.submitter?.value;
      if (accion === 'borrar') return terminar('borrar');
      if (accion !== 'guardar') return terminar(null);
      terminar(leerValores());
    };
    form.addEventListener('submit', alEnviar);
    if (previa) form.addEventListener('input', actualizarPrevia);
    dlg.addEventListener('close', alCerrar);
    dlg.showModal();
    // El foco va al primer campo obligatorio que falta llenar (en un gasto nuevo, el
    // monto; en una deuda nueva, el nombre). Si no falta ninguno, al primer campo.
    const campos = [...form.querySelectorAll('input:not([type=checkbox]), select, textarea')];
    (campos.find(el => el.required && !el.value) || campos[0])?.focus();
  });
}

function campoHTML(c) {
  const req = c.requerido ? 'required' : '';
  const id = 'campo-' + c.nombre;
  const valor = c.valor ?? '';
  const ayuda = c.ayuda ? `<small>${esc(c.ayuda)}</small>` : '';
  let control;
  switch (c.tipo) {
    case 'select':
      control = `<select id="${id}" name="${c.nombre}" ${req}>
        ${c.opciones.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(valor) ? 'selected' : ''}>${esc(t)}</option>`).join('')}
      </select>`;
      break;
    case 'textarea':
      control = `<textarea id="${id}" name="${c.nombre}" rows="2" placeholder="${esc(c.placeholder || '')}" ${req}>${esc(valor)}</textarea>`;
      break;
    case 'checkbox':
      return `<label class="campo campo-check"><input type="checkbox" name="${c.nombre}" ${valor ? 'checked' : ''}> <span>${esc(c.etiqueta)}${ayuda}</span></label>`;
    case 'monto':
      control = inputMonto({ nombre: c.nombre, valor, placeholder: c.placeholder || '0', id, requerido: c.requerido });
      break;
    case 'number':
      control = `<input id="${id}" name="${c.nombre}" type="number" inputmode="decimal" step="any" ${c.min != null ? `min="${c.min}"` : ''} ${c.max != null ? `max="${c.max}"` : ''} value="${esc(valor)}" placeholder="${esc(c.placeholder || '')}" ${req}>`;
      break;
    default: {
      const lista = c.sugerencias?.length ? `lista-${c.nombre}` : '';
      control = `<input id="${id}" name="${c.nombre}" type="${c.tipo || 'text'}" value="${esc(valor)}" placeholder="${esc(c.placeholder || '')}" ${lista ? `list="${lista}" autocomplete="off"` : ''} ${req}>`
        + (lista ? `<datalist id="${lista}">${c.sugerencias.map(t => `<option value="${esc(t)}"></option>`).join('')}</datalist>` : '');
    }
  }
  return `<label class="campo" for="${id}"><span>${esc(c.etiqueta)}</span>${control}${ayuda}</label>`;
}

export function confirmar(mensaje) {
  return Promise.resolve(window.confirm(mensaje));
}

// Para los logros que se lo ganan (terminar una deuda, que te paguen todo):
// la moneda cae y se dibuja un check. Lo de todos los días no se celebra.
const ICONO_LOGRO = `<svg class="icono-logro" viewBox="0 0 24 24" aria-hidden="true">
  <circle class="logro-moneda" cx="12" cy="12" r="10"/><path class="logro-check" d="M7.5 12.5l3 3 6-6.5"/></svg>`;

let temporizador;
export function avisar(texto, tipo = 'ok') {
  const el = document.getElementById('aviso');
  el.textContent = texto;
  anunciarMontosOcultos(el);
  if (tipo === 'logro') el.insertAdjacentHTML('afterbegin', ICONO_LOGRO);
  el.dataset.tipo = tipo;
  el.classList.add('visible');
  clearTimeout(temporizador);
  temporizador = setTimeout(() => el.classList.remove('visible'), 3200);
}

// Barra de progreso con estado (ok / alerta / excedido). El estado va también
// en texto: el color nunca es la única señal.
export function barraProgreso(gastado, tope, estado) {
  const pct = tope ? Math.max(0, Math.min(100, (gastado / tope) * 100)) : 0;
  return `<div class="progreso" data-estado="${estado}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}">
    ${pct > 0 ? `<div style="width:${pct}%"></div>` : ''}
  </div>`;
}

export const ICONO_ESTADO = { ok: '', alerta: '⚠ Cerca del tope', excedido: '↑ Sobre el tope del mes', 'sin-tope': '' };

// Ejecuta una acción que guarda datos, avisa si falla (por ejemplo, sin
// internet) y vuelve a dibujar la pantalla.
export async function ejecutar(accion, mensajeOk, refrescar, tipo = 'ok') {
  try {
    await accion();
    if (mensajeOk) avisar(mensajeOk, tipo);
  } catch (e) {
    console.error(e);
    avisar('No se pudo guardar: ' + (e.message || e), 'error');
  }
  refrescar?.();
}
