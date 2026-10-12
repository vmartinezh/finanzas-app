import { esc } from './util.js';

const dialogo = () => document.getElementById('dialogo');

// Abre un formulario en un diálogo y devuelve los valores, null si se cancela,
// o 'borrar' si se apretó el botón de borrar.
//   campos: [{ nombre, etiqueta, tipo: 'text'|'monto'|'number'|'date'|'select'|'textarea'|'checkbox',
//              valor, opciones: [[valor, texto]], requerido, ayuda, placeholder }]
export function abrirFormulario({ titulo, campos, textoGuardar = 'Guardar', puedeBorrar = false, intro = '' }) {
  const dlg = dialogo();
  const form = document.getElementById('dialogo-form');
  form.innerHTML = `
    <h2>${esc(titulo)}</h2>
    ${intro ? `<p class="intro">${intro}</p>` : ''}
    ${campos.map(campoHTML).join('')}
    <div class="acciones">
      ${puedeBorrar ? '<button value="borrar" class="boton peligro" formnovalidate>Borrar</button>' : ''}
      <span class="espacio"></span>
      <button value="cancelar" class="boton secundario" formnovalidate>Cancelar</button>
      <button value="guardar" class="boton primario">${esc(textoGuardar)}</button>
    </div>`;

  return new Promise(resolve => {
    // Se responde al enviar el formulario (botones) o al cerrar con Esc / atrás.
    const terminar = resultado => {
      form.removeEventListener('submit', alEnviar);
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
      const valores = {};
      for (const c of campos) {
        const el = form.elements[c.nombre];
        if (c.tipo === 'checkbox') valores[c.nombre] = el.checked;
        else if (c.tipo === 'monto' || c.tipo === 'number') valores[c.nombre] = el.value === '' ? null : Number(String(el.value).replace(',', '.'));
        else valores[c.nombre] = el.value === '' ? null : el.value;
      }
      terminar(valores);
    };
    form.addEventListener('submit', alEnviar);
    dlg.addEventListener('close', alCerrar);
    dlg.showModal();
    form.querySelector('input:not([type=checkbox]), select, textarea')?.focus();
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
      return `<label class="campo campo-check"><input type="checkbox" name="${c.nombre}" ${valor ? 'checked' : ''}> ${esc(c.etiqueta)}</label>`;
    case 'monto':
      control = `<input id="${id}" name="${c.nombre}" type="number" inputmode="numeric" min="0" step="1" value="${esc(valor)}" placeholder="${esc(c.placeholder || '0')}" ${req}>`;
      break;
    case 'number':
      control = `<input id="${id}" name="${c.nombre}" type="number" inputmode="decimal" step="any" value="${esc(valor)}" placeholder="${esc(c.placeholder || '')}" ${req}>`;
      break;
    default:
      control = `<input id="${id}" name="${c.nombre}" type="${c.tipo || 'text'}" value="${esc(valor)}" placeholder="${esc(c.placeholder || '')}" ${req}>`;
  }
  return `<label class="campo" for="${id}"><span>${esc(c.etiqueta)}</span>${control}${ayuda}</label>`;
}

export function confirmar(mensaje) {
  return Promise.resolve(window.confirm(mensaje));
}

let temporizador;
export function avisar(texto, tipo = 'ok') {
  const el = document.getElementById('aviso');
  el.textContent = texto;
  el.dataset.tipo = tipo;
  el.classList.add('visible');
  clearTimeout(temporizador);
  temporizador = setTimeout(() => el.classList.remove('visible'), 3200);
}

// Barra de progreso con estado (ok / alerta / excedido). El estado va también
// en texto: el color nunca es la única señal.
export function barraProgreso(gastado, tope, estado) {
  const pct = tope ? Math.min(100, (gastado / tope) * 100) : 0;
  return `<div class="progreso" data-estado="${estado}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}">
    <div style="width:${pct}%"></div>
  </div>`;
}

export const ICONO_ESTADO = { ok: '', alerta: '⚠ Cerca del tope', excedido: '✕ Te pasaste', 'sin-tope': '' };

// Ejecuta una acción que guarda datos, avisa si falla (por ejemplo, sin
// internet) y vuelve a dibujar la pantalla.
export async function ejecutar(accion, mensajeOk, refrescar) {
  try {
    await accion();
    if (mensajeOk) avisar(mensajeOk);
  } catch (e) {
    console.error(e);
    avisar('No se pudo guardar: ' + (e.message || e), 'error');
  }
  refrescar?.();
}
