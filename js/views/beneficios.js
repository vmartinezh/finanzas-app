import { datos, guardarPerfil } from '../db.js';
import { TARJETAS, RUBROS, DIAS, REVISADO, beneficiosDelDia, diaSemana, textoDias, catalogoAntiguo } from '../beneficios.js';
import { ejecutar } from '../ui.js';
import { clp, esc, hoyISO, sumarDias, fechaCorta } from '../util.js';

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
    b.tope ? `tope ${clp(b.tope)}` : null,
    b.hasta ? `hasta el ${fechaCorta(b.hasta)}` : null,
  ].filter(Boolean).join(' · ');
  return `<li><a class="fila" href="${esc(b.fuente)}" target="_blank" rel="noopener noreferrer">
    <span class="icono-cat" aria-hidden="true">${RUBROS[b.rubro] || '🏷️'}</span>
    <span class="fila-texto"><b>${esc(b.comercio)}</b><small>${esc(detalle)}</small>${b.nota ? `<small class="nota">${esc(b.nota)}</small>` : ''}</span>
    <span class="descuento">${esc(b.descuento)}</span>
    <span class="sr-only">(abre la página del banco)</span>
  </a></li>`;
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
      <h2>Mis tarjetas</h2>
      <p class="ayuda">Marca las que tienes y te muestro en qué tienes descuento cada día.</p>
      <div class="chips" role="group" aria-label="Mis tarjetas">${TARJETAS.map(t => `
        <button class="chip" data-tarjeta="${t.id}" aria-pressed="${mias.includes(t.id)}" title="${esc(t.detalle)}">${esc(t.nombre)}</button>`).join('')}
      </div>
    </section>

    <section class="tarjeta">
      <div class="chips selector-dia" role="group" aria-label="Día de la semana">${DIAS.map((nombre, i) => `
        <button class="chip" data-dia="${i + 1}" aria-pressed="${dia === i + 1}" aria-label="${nombre}${i + 1 === diaHoy ? ' (hoy)' : ''}">${nombre.slice(0, 2)}${i + 1 === diaHoy ? '<span class="punto-hoy" aria-hidden="true"></span>' : ''}</button>`).join('')}
      </div>
      <h2>${esc(tituloDia)}</h2>
      ${!mias.length ? '<div class="vacio">Marca tus tarjetas arriba para ver tus descuentos.</div>'
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
  raiz.querySelectorAll('[data-tarjeta]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.tarjeta;
    const actuales = datos.perfil.tarjetas || [];
    const tarjetas = actuales.includes(id) ? actuales.filter(t => t !== id) : [...actuales, id];
    ejecutar(() => guardarPerfil({ tarjetas }), null, refrescar);
  }));
  raiz.querySelectorAll('[data-dia]').forEach(b => b.addEventListener('click', () => {
    diaElegido = Number(b.dataset.dia);
    refrescar();
  }));
}
