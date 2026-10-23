import { datos, guardarPerfil } from '../db.js';
import { TARJETAS, RUBROS, DIAS, REVISADO, beneficiosDelDia, diaSemana, textoDias, catalogoAntiguo } from '../beneficios.js';
import { ejecutar } from '../ui.js';
import { TIPOS, separarTarjeta, tarjetaHTML, activarTarjetas3D } from '../tarjetas.js';
import { clp, esc, hoyISO, sumarDias, fechaCorta, conMontosVisibles } from '../util.js';

export const titulo = 'Descuentos';

// Día que se está mirando (1 = lunes … 7 = domingo); null = hoy.
let diaElegido = null;

const nombreTarjeta = id => TARJETAS.find(t => t.id === id)?.nombre ?? id;

// Una fila por descuento. Toda la fila lleva a la ficha oficial del banco,
// que es donde están las condiciones completas.
export function filaBeneficio(b, { conTarjeta = true } = {}) {
  const detalle = [
    conTarjeta ? nombreTarjeta(b.tarjeta) : null,
    // Si es de un solo día, ya está dicho en el título ("Hoy martes").
    b.dias.length > 1 ? textoDias(b.dias) : null,
    // El tope es del banco, no de la persona: se ve aunque el ojo esté cerrado.
    b.tope ? `tope ${conMontosVisibles(() => clp(b.tope))}` : null,
    b.hasta ? `hasta el ${fechaCorta(b.hasta)}` : null,
  ].filter(Boolean).join(' · ');
  return `<li><a class="fila" href="${esc(b.fuente)}" target="_blank" rel="noopener noreferrer">
    <span class="icono-cat" aria-hidden="true">${RUBROS[b.rubro] || '🏷️'}</span>
    <span class="fila-texto"><b>${esc(b.comercio)}</b><small>${esc(detalle)}</small>${b.nota ? `<small class="nota">${esc(b.nota)}</small>` : ''}</span>
    <span class="descuento">${esc(b.descuento)}</span>
    <span class="sr-only">(abre la página del banco)</span>
  </a></li>`;
}

// null: mirando · true: eligiendo el banco · 'cmr': eligiendo el tipo de ese banco.
let eligiendo = null;

const bancoDelCatalogo = id => TARJETAS.find(t => t.id === separarTarjeta(id).banco);
const nombreBanco = id => bancoDelCatalogo(id)?.nombre ?? 'Tarjeta';
function nombreConTipo(id) {
  const { banco, tipo } = separarTarjeta(id);
  const elTipo = TIPOS[banco]?.find(t => t.id === tipo);
  return elTipo ? `${nombreBanco(id)} ${elTipo.nombre}` : nombreBanco(id);
}

function elegirHTML(mias) {
  if (eligiendo === true) {
    return `<div class="elegir-tarjeta">
      <p class="ayuda">¿De qué banco es?</p>
      <div class="chips" role="group" aria-label="Banco">${TARJETAS.map(t => `
        <button class="chip" data-banco="${t.id}" title="${esc(t.detalle)}">${esc(t.nombre)}</button>`).join('')}
      </div>
      <button class="boton-texto" id="cancelar-tarjeta">Cancelar</button>
    </div>`;
  }
  const banco = TARJETAS.find(t => t.id === eligiendo);
  return `<div class="elegir-tarjeta">
    <p class="ayuda">¿Cuál ${esc(banco.nombre)} tienes?</p>
    <ul class="elegir-tipo">${TIPOS[eligiendo].map(t => {
      const id = `${eligiendo}:${t.id}`;
      return `<li><button class="elegir-tipo-boton" data-agregar="${id}" ${mias.includes(id) ? 'disabled' : ''}>
        ${tarjetaHTML(id, banco.nombre, { chica: true })}
        <span>${esc(t.nombre)}${mias.includes(id) ? ' · ya la tienes' : ''}</span>
      </button></li>`;
    }).join('')}</ul>
    <button class="boton-texto" id="cancelar-tarjeta">Cancelar</button>
  </div>`;
}

export function render() {
  const hoy = hoyISO();
  const diaHoy = diaSemana(hoy);
  const dia = diaElegido ?? diaHoy;
  // La próxima vez que toca ese día, contando hoy: así se descartan los que ya vencieron.
  const fecha = sumarDias(hoy, (dia - diaHoy + 7) % 7);
  const mias = datos.perfil.tarjetas || [];
  const lista = beneficiosDelDia(mias, fecha);
  const delDia = lista.filter(b => b.dias.length);
  const siempre = lista.filter(b => !b.dias.length);
  const tituloDia = dia === diaHoy ? `Hoy ${DIAS[dia - 1]}` : `El ${DIAS[dia - 1]} ${fechaCorta(fecha)}`;

  return `
    <section class="tarjeta">
      <div class="titulo-con-accion"><h2>Mis tarjetas</h2>${eligiendo ? '' : '<button class="boton pequeño" id="agregar-tarjeta">+ Agregar</button>'}</div>
      ${mias.length ? `<ul class="mis-tarjetas">${mias.map(id => `
        <li>
          ${tarjetaHTML(id, nombreBanco(id))}
          <span class="mis-tarjetas-pie"><b>${esc(nombreConTipo(id))}</b><button class="boton-texto" data-quitar="${esc(id)}">Quitar</button></span>
        </li>`).join('')}</ul>`
      : eligiendo ? '' : '<p class="ayuda">Agrega las tarjetas que tienes y te muestro en qué tienes descuento cada día.</p>'}
      ${eligiendo ? elegirHTML(mias) : ''}
    </section>

    <section class="tarjeta">
      <div class="chips selector-dia" role="group" aria-label="Día de la semana">${DIAS.map((nombre, i) => `
        <button class="chip" data-dia="${i + 1}" aria-pressed="${dia === i + 1}" aria-label="${nombre}${i + 1 === diaHoy ? ' (hoy)' : ''}">${nombre.slice(0, 2)}${i + 1 === diaHoy ? '<span class="punto-hoy" aria-hidden="true"></span>' : ''}</button>`).join('')}
      </div>
      <h2>${esc(tituloDia)}</h2>
      ${!mias.length ? '<div class="vacio">Agrega tus tarjetas arriba para ver tus descuentos.</div>'
        : !lista.length ? `<div class="vacio">Ese día no hay descuentos con tus tarjetas.</div>`
        : `
          ${delDia.length ? `<ul class="lista">${delDia.map(b => filaBeneficio(b)).join('')}</ul>` : '<p class="ayuda">Ese día no hay descuentos especiales con tus tarjetas.</p>'}
          ${siempre.length ? `
            <h3 class="subtitulo">Todos los días</h3>
            <ul class="lista">${siempre.map(b => filaBeneficio(b)).join('')}</ul>` : ''}`}
      <p class="nota">Lista revisada el ${esc(fechaCorta(REVISADO))}.${catalogoAntiguo(hoy) ? ' Hace rato que no la revisamos: puede haber cambios.' : ''}
        Cada banco pone sus condiciones (tarjetas, montos mínimos, locales): tócalo para ver la ficha oficial antes de pagar.</p>
    </section>
  `;
}

export function montar(raiz, refrescar) {
  activarTarjetas3D(raiz);
  const guardarTarjetas = tarjetas => ejecutar(() => guardarPerfil({ tarjetas }), null, refrescar);
  raiz.querySelector('#agregar-tarjeta')?.addEventListener('click', () => { eligiendo = true; refrescar(); });
  raiz.querySelector('#cancelar-tarjeta')?.addEventListener('click', () => { eligiendo = null; refrescar(); });
  raiz.querySelectorAll('[data-banco]').forEach(b => b.addEventListener('click', () => {
    const banco = b.dataset.banco;
    // Un banco con tipos dibujados pide elegir el tipo; los demás se agregan al tiro.
    if (TIPOS[banco]) { eligiendo = banco; refrescar(); return; }
    eligiendo = null;
    const actuales = datos.perfil.tarjetas || [];
    if (actuales.includes(banco)) refrescar();
    else guardarTarjetas([...actuales, banco]);
  }));
  raiz.querySelectorAll('[data-agregar]').forEach(b => b.addEventListener('click', () => {
    eligiendo = null;
    const id = b.dataset.agregar;
    const actuales = datos.perfil.tarjetas || [];
    if (!actuales.includes(id)) guardarTarjetas([...actuales, id]);
    else refrescar();
  }));
  raiz.querySelectorAll('[data-quitar]').forEach(b => b.addEventListener('click', () => {
    guardarTarjetas((datos.perfil.tarjetas || []).filter(t => t !== b.dataset.quitar));
  }));
  raiz.querySelectorAll('[data-dia]').forEach(b => b.addEventListener('click', () => {
    diaElegido = Number(b.dataset.dia);
    refrescar();
  }));
}
