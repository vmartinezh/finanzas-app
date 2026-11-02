// Tus tarjetas: se registran una vez (banco, tipo y, si quieres, los últimos 4
// dígitos) y de ahí las usan Plan (lo que debes y el disponible de cada una),
// Descuentos y Tu cumpleaños. Nunca se pide el número completo, el vencimiento
// ni el código de seguridad.
//
// Las tarjetas viven en perfil.tarjetas ('cmr:elite#1234') y cada deuda de
// tarjeta apunta a una con deudas.tarjeta: al cambiar o quitar una tarjeta, sus
// deudas se actualizan juntas.
import { datos, guardarPerfil, guardarVarios } from './db.js';
import { TARJETAS, separarTarjeta, armarTarjeta, agregarTarjeta, reemplazarTarjeta } from './beneficios.js';
import { TIPOS, tipoDe, tarjetaHTML } from './tarjetas.js';
import { esc } from './util.js';

export const misTarjetas = () => datos.perfil.tarjetas || [];
export const misTarjetasDelBanco = banco => misTarjetas().filter(t => separarTarjeta(t).banco === banco);

const bancoDe = id => TARJETAS.find(t => t.id === separarTarjeta(id).banco);
export const nombreBanco = id => bancoDe(id)?.nombre ?? 'Tarjeta';

// "Santander Platinum LATAM Pass ·4821": el nombre con el que se reconoce.
export function nombreTarjeta(id, { conDigitos = true } = {}) {
  const tipo = tipoDe(id);
  const { terminacion } = separarTarjeta(id);
  return `${nombreBanco(id)}${tipo ? ' ' + tipo.nombre : ''}${conDigitos && terminacion ? ' ·' + terminacion : ''}`;
}

export const deudaDe = id => datos.deudas.find(d => d.tarjeta === id) ?? null;

// Guarda una tarjeta nueva o cambia una (reemplaza). Las deudas que apuntaban a
// la anterior pasan a la nueva.
export async function guardarTarjeta(nueva, reemplaza = null) {
  const actuales = misTarjetas();
  const lista = reemplaza ? reemplazarTarjeta(actuales, reemplaza, nueva) : agregarTarjeta(actuales, nueva);
  // Si agregar completó una tarjeta con menos datos, esa es la que se reemplazó.
  const antes = reemplaza ?? actuales.find(t => !lista.includes(t)) ?? null;
  await cambiarJuntos(actuales, lista, antes, nueva);
}

// Quitar una tarjeta no borra sus deudas: quedan sin tarjeta.
export async function quitarTarjeta(id) {
  const actuales = misTarjetas();
  await cambiarJuntos(actuales, actuales.filter(t => t !== id), id, null);
}

// La lista de tarjetas y las deudas que apuntan a ellas cambian juntas: si las
// deudas no se pueden guardar, la lista vuelve a como estaba.
async function cambiarJuntos(actuales, lista, de, a) {
  if (lista !== actuales) await guardarPerfil({ tarjetas: lista });
  if (!de || de === a) return;
  // Cada tarjeta, una deuda: si la nueva ya tenía la suya, las de la anterior quedan sueltas.
  const destino = a && datos.deudas.some(d => d.tarjeta === a) ? null : a;
  const filas = datos.deudas.filter(d => d.tarjeta === de).map(d => ({ ...d, tarjeta: destino }));
  if (!filas.length) return;
  try {
    await guardarVarios('deudas', filas);
  } catch (e) {
    if (lista !== actuales) await guardarPerfil({ tarjetas: actuales }).catch(() => {});
    throw e;
  }
}

// ── Elegir una tarjeta: banco → tipo (si está dibujado) → 4 dígitos ───────────
// Un solo selector abierto a la vez en toda la app; se cierra al cambiar de pantalla.
let eligiendo = null; // { paso: 'banco' | 'tipo' | 'digitos', banco, tipo, reemplaza, enfocado }
window.addEventListener('hashchange', () => { eligiendo = null; });
export const estaEligiendo = () => eligiendo !== null;

export function empezarAElegir(reemplaza = null, paso = null) {
  const { banco = null, tipo = null } = reemplaza ? separarTarjeta(reemplaza) : {};
  eligiendo = { paso: paso ?? (reemplaza ? 'digitos' : 'banco'), banco, tipo, reemplaza };
}

export function elegirHTML() {
  if (!eligiendo) return '';
  const { paso, banco, tipo, reemplaza } = eligiendo;
  const cancelar = '<button type="button" class="boton-texto" data-elegir="cancelar">Cancelar</button>';
  const mias = misTarjetas();
  if (paso === 'banco') {
    return `<div class="elegir-tarjeta">
      <p class="ayuda">¿De qué banco es?</p>
      <div class="chips" role="group" aria-label="Banco">${TARJETAS.map(t => `
        <button type="button" class="chip" data-elegir-banco="${t.id}" title="${esc(t.detalle)}">${esc(t.nombre)}</button>`).join('')}
      </div>
      ${cancelar}
    </div>`;
  }
  const nombre = bancoDe(banco)?.nombre ?? 'Tarjeta';
  if (paso === 'tipo') {
    return `<div class="elegir-tarjeta">
      <p class="ayuda">¿Cuál ${esc(nombre)} tienes?</p>
      <ul class="elegir-tipo">${TIPOS[banco].map(t => `<li><button type="button" class="elegir-tipo-boton" data-elegir-tipo="${t.id}">
        ${tarjetaHTML(`${banco}:${t.id}`, nombre, { chica: true })}
        <span>${esc(t.nombre)}</span>
      </button></li>`).join('')}</ul>
      <button type="button" class="boton-texto" data-elegir-tipo="">No está o no sé cuál es</button>
      ${cancelar}
    </div>`;
  }
  const { terminacion } = reemplaza ? separarTarjeta(reemplaza) : {};
  const muestra = armarTarjeta({ banco, tipo, terminacion });
  return `<form class="elegir-tarjeta" id="elegir-digitos" novalidate>
    ${tarjetaHTML(muestra, nombre, { chica: true })}
    <label class="campo"><span>Últimos 4 dígitos (opcional)</span>
      <input name="digitos" inputmode="numeric" autocomplete="off" maxlength="4" pattern="[0-9]{4}" placeholder="ej: 4821" value="${esc(terminacion ?? '')}">
      <small>Para reconocerla, sobre todo si tienes dos parecidas. Solo esos 4: nunca te vamos a pedir el número completo, la fecha ni el código de atrás.</small>
    </label>
    <div class="botones">
      <button class="boton primario">${reemplaza ? 'Guardar' : 'Agregar tarjeta'}</button>
      ${reemplaza && TIPOS[banco] ? '<button type="button" class="boton-texto" data-elegir="otro-tipo">Cambiar el tipo</button>' : ''}
      ${cancelar}
    </div>
    ${!reemplaza && mias.some(t => separarTarjeta(t).banco === banco && separarTarjeta(t).tipo === tipo) ? '<p class="nota">Ya tienes una igual: con los 4 dígitos las distingues.</p>' : ''}
  </form>`;
}

// alGuardar(id): después de guardar la tarjeta (para refrescar la pantalla).
export function montarElegir(raiz, { refrescar, alGuardar, avisarError }) {
  raiz.querySelectorAll('[data-elegir="cancelar"]').forEach(b => b.addEventListener('click', () => { eligiendo = null; refrescar(); }));
  raiz.querySelector('[data-elegir="otro-tipo"]')?.addEventListener('click', () => { eligiendo.paso = 'tipo'; eligiendo.enfocado = false; refrescar(); });
  raiz.querySelectorAll('[data-elegir-banco]').forEach(b => b.addEventListener('click', () => {
    eligiendo.banco = b.dataset.elegirBanco;
    eligiendo.paso = TIPOS[eligiendo.banco] ? 'tipo' : 'digitos';
    refrescar();
  }));
  raiz.querySelectorAll('[data-elegir-tipo]').forEach(b => b.addEventListener('click', () => {
    eligiendo.tipo = b.dataset.elegirTipo || null;
    eligiendo.paso = 'digitos';
    refrescar();
  }));
  const form = raiz.querySelector('#elegir-digitos');
  // El foco va a los dígitos al llegar a ese paso, no cada vez que se redibuja la pantalla.
  if (form && !eligiendo.enfocado) {
    eligiendo.enfocado = true;
    form.digitos.focus();
  }
  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const digitos = form.digitos.value.trim();
    if (digitos && !/^\d{4}$/.test(digitos)) {
      form.digitos.setCustomValidity('Son 4 números, o déjalo vacío.');
      form.digitos.reportValidity();
      form.digitos.addEventListener('input', () => form.digitos.setCustomValidity(''), { once: true });
      return;
    }
    const { banco, tipo, reemplaza } = eligiendo;
    const id = armarTarjeta({ banco, tipo, terminacion: digitos || null });
    try {
      await guardarTarjeta(id, reemplaza);
      eligiendo = null;
      alGuardar?.(id);
    } catch (err) {
      avisarError('No se pudo guardar la tarjeta: ' + err.message);
    }
    refrescar();
  });
}
