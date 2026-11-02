// Tus tarjetas: se registran una vez (banco, tipo y, si quieres, los últimos 4
// dígitos) y de ahí las usan Plan (lo que debes y el disponible de cada una),
// Descuentos y Tu cumpleaños. Nunca se pide el número completo, el vencimiento
// ni el código de seguridad.
//
// Cada tarjeta es una fila de la tabla cuentas (tipo 'credito' o 'debito'), con
// el banco (institucion) y el tipo de tarjeta (producto) del catálogo. Su deuda
// la apunta con deudas.cuenta_id y su cupo vive en la tarjeta. Como la deuda
// apunta al id, cambiar el tipo o los dígitos de la tarjeta no toca la deuda.
import { datos, guardar, guardarVarios, faltaTabla } from './db.js';
import { TARJETAS, armarTarjeta, agregarTarjeta } from './beneficios.js';
import { TIPOS, tipoDe, tarjetaHTML } from './tarjetas.js';
import { esc } from './util.js';

const ES_TARJETA = new Set(['credito', 'debito']);
// En el orden en que se agregaron; las recién agregadas (sin fecha todavía) al final.
const fecha = c => c.creado ?? '\uffff';
const porFecha = (a, b) => (fecha(a) < fecha(b) ? -1 : fecha(a) > fecha(b) ? 1 : 0);

export const misTarjetas = () => datos.cuentas.filter(c => ES_TARJETA.has(c.tipo) && c.activa !== false).sort(porFecha);
export const misTarjetasDelBanco = banco => misTarjetas().filter(c => c.institucion === banco);
export const cuentaPorId = id => datos.cuentas.find(c => c.id === id) ?? null;

// 'cmr:elite#1234': como la reconoce el catálogo (dibujo, descuentos, regalos).
export const claveDe = c => armarTarjeta({ banco: c.institucion, tipo: c.producto, terminacion: c.terminacion });
export const misClaves = () => misTarjetas().map(claveDe);

export const nombreDelBanco = banco => TARJETAS.find(t => t.id === banco)?.nombre ?? 'Tarjeta';
export const nombreBanco = c => nombreDelBanco(c.institucion);

// "Santander Platinum LATAM Pass ·4821": el nombre con el que se reconoce.
export function nombreTarjeta(c, { conDigitos = true } = {}) {
  const tipo = tipoDe(claveDe(c));
  return `${nombreBanco(c)}${tipo ? ' ' + tipo.nombre : ''}${conDigitos && c.terminacion ? ' ·' + c.terminacion : ''}`;
}

export const dibujoTarjeta = (c, opciones) => tarjetaHTML(claveDe(c), nombreBanco(c), opciones);

export const deudaDe = c => datos.deudas.find(d => d.cuenta_id === c.id) ?? null;

// Guarda una tarjeta nueva o cambia una (reemplaza: su id). Si ya tenías una
// del mismo banco con menos datos (sin tipo, o sin los 4 dígitos), se completa
// esa en vez de repetirla. Devuelve la fila guardada.
export async function guardarTarjeta({ banco, tipo = null, terminacion = null }, reemplaza = null) {
  const campos = { institucion: banco, producto: tipo, terminacion };
  const clave = armarTarjeta({ banco, tipo, terminacion });
  const mias = misTarjetas();
  if (reemplaza) {
    if (mias.some(c => c.id !== reemplaza && claveDe(c) === clave)) throw new Error('Ya tienes esa tarjeta anotada.');
    return guardar('cuentas', { ...cuentaPorId(reemplaza), ...campos });
  }
  const claves = mias.map(claveDe);
  const lista = agregarTarjeta(claves, clave);
  if (lista === claves) return mias[claves.indexOf(clave)];
  const completada = claves.findIndex((t, i) => t !== lista[i]);
  if (completada >= 0) return guardar('cuentas', { ...mias[completada], ...campos });
  // La habías quitado (quedó archivada): vuelve con sus compras.
  const archivada = datos.cuentas.find(c => c.activa === false && claveDe(c) === clave);
  if (archivada) return guardar('cuentas', { ...archivada, activa: true });
  return guardar('cuentas', { tipo: 'credito', ...campos, apodo: null, cupo_total: null, dia_facturacion: null, activa: true });
}

// Quitar una tarjeta no borra su deuda: queda anotada, sin tarjeta, y se lleva
// el cupo para no perder la alerta de uso. La tarjeta se archiva, no se borra:
// sus compras (también las que lleguen solas mientras la app está abierta)
// siguen diciendo con cuál fueron, y si la vuelves a agregar, vuelve con ellas.
export async function quitarTarjeta(id) {
  const cuenta = cuentaPorId(id);
  const deudas = datos.deudas.filter(d => d.cuenta_id === id);
  if (deudas.length) await guardarVarios('deudas', deudas.map(d => ({ ...d, cuenta_id: null, cupo_total: d.cupo_total ?? cuenta?.cupo_total ?? null })));
  await guardar('cuentas', { ...cuenta, activa: false, cupo_total: null });
}

// "CMR Falabella ·1234": corto, para la fila de un gasto.
export const nombreCorto = c => `${nombreBanco(c)}${c.terminacion ? ' ·' + c.terminacion : ''}`;

// Lo que llevas comprado este mes con esa tarjeta.
export const gastadoEnElMes = (c, mes) => datos.movimientos
  .filter(m => m.cuenta_id === c.id && m.tipo === 'gasto' && m.fecha?.startsWith(mes))
  .reduce((s, m) => s + m.monto, 0);

// Guarda una deuda con su cupo: si la deuda es de una tarjeta, el cupo se
// guarda en la tarjeta; si no, en la deuda. Si la nube todavía no tiene la
// tabla cuentas, las tarjetas viven solo en memoria: el cupo se queda en la
// deuda (la tarjeta en memoria se actualiza para que se vea igual).
export async function guardarDeuda(fila, cupo) {
  const cuenta = fila.cuenta_id ? cuentaPorId(fila.cuenta_id) : null;
  if (faltaTabla('cuentas')) {
    if (cuenta) cuenta.cupo_total = cupo;
    return guardar('deudas', { ...fila, cupo_total: cupo });
  }
  if (cuenta && cuenta.cupo_total !== cupo) await guardar('cuentas', { ...cuenta, cupo_total: cupo });
  return guardar('deudas', { ...fila, cupo_total: cuenta ? null : cupo });
}

// ── Elegir una tarjeta: banco → tipo (si está dibujado) → 4 dígitos ───────────
// Un solo selector abierto a la vez en toda la app; se cierra al cambiar de pantalla.
let eligiendo = null; // { paso: 'banco' | 'tipo' | 'digitos', banco, tipo, reemplaza (id), enfocado }
window.addEventListener('hashchange', () => { eligiendo = null; });
export const estaEligiendo = () => eligiendo !== null;

export function empezarAElegir(reemplaza = null, paso = null) {
  const c = reemplaza ? cuentaPorId(reemplaza) : null;
  eligiendo = { paso: paso ?? (c ? 'digitos' : 'banco'), banco: c?.institucion ?? null, tipo: c?.producto ?? null, reemplaza: c?.id ?? null };
}

export function elegirHTML() {
  if (!eligiendo) return '';
  const { paso, banco, tipo, reemplaza } = eligiendo;
  const cancelar = '<button type="button" class="boton-texto" data-elegir="cancelar">Cancelar</button>';
  if (paso === 'banco') {
    return `<div class="elegir-tarjeta">
      <p class="ayuda">¿De qué banco es?</p>
      <div class="chips" role="group" aria-label="Banco">${TARJETAS.map(t => `
        <button type="button" class="chip" data-elegir-banco="${t.id}" title="${esc(t.detalle)}">${esc(t.nombre)}</button>`).join('')}
      </div>
      ${cancelar}
    </div>`;
  }
  const nombre = nombreDelBanco(banco);
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
  const terminacion = reemplaza ? cuentaPorId(reemplaza)?.terminacion ?? null : null;
  const muestra = armarTarjeta({ banco, tipo, terminacion });
  const repetida = !reemplaza && misTarjetas().some(c => c.institucion === banco && c.producto === tipo);
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
    ${repetida ? '<p class="nota">Ya tienes una igual: con los 4 dígitos las distingues.</p>' : ''}
  </form>`;
}

// alGuardar(cuenta): después de guardar la tarjeta (para refrescar la pantalla).
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
    try {
      const cuenta = await guardarTarjeta({ banco, tipo, terminacion: digitos || null }, reemplaza);
      eligiendo = null;
      alGuardar?.(cuenta);
    } catch (err) {
      avisarError('No se pudo guardar la tarjeta: ' + err.message);
    }
    refrescar();
  });
}
