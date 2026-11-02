import { RUBROS, DIAS, REVISADO, beneficiosDelDia, diaSemana, textoDias, catalogoAntiguo } from '../beneficios.js';
import { avisar, confirmar, ejecutar } from '../ui.js';
import { TIPOS, activarTarjetas3D } from '../tarjetas.js';
import { misTarjetas, misTarjetasDelBanco, nombreDelBanco, claveDe, cuentaPorId, nombreTarjeta, dibujoTarjeta, deudaDe, quitarTarjeta, empezarAElegir, estaEligiendo, elegirHTML, montarElegir } from '../mis-tarjetas.js';
import { usoCupo } from '../calculos.js';
import { clp, esc, hoyISO, sumarDias, fechaCorta, conMontosVisibles } from '../util.js';

export const titulo = 'Descuentos';

// Día que se está mirando (1 = lunes … 7 = domingo); null = hoy.
let diaElegido = null;

// Con cuál de tus tarjetas sirve ("con tu CMR Elite ·1234"); si son varias del
// mismo banco, se nombra el banco.
const conTuTarjeta = (banco, mias) => (mias.length === 1 ? `con tu ${nombreTarjeta(mias[0])}` : nombreDelBanco(banco));

// Si todas tus tarjetas de ese banco están sobre el 85% del cupo, se recuerda.
function avisoCupo(mias) {
  const altas = mias.map(deudaDe).filter(d => d && d.saldo > 0 && usoCupo(d)?.estado === 'excedido');
  if (!altas.length || altas.length < mias.length) return null;
  return `Ojo: a esa tarjeta le quedan ${conMontosVisibles(() => clp(Math.max(0, usoCupo(altas[0]).disponible)))} de cupo.`;
}

// Una fila por descuento. Toda la fila lleva a la ficha oficial del banco,
// que es donde están las condiciones completas.
export function filaBeneficio(b, { conTarjeta = true } = {}) {
  const mias = conTarjeta ? misTarjetasDelBanco(b.tarjeta) : [];
  const cupo = conTarjeta ? avisoCupo(mias) : null;
  const detalle = [
    conTarjeta ? conTuTarjeta(b.tarjeta, mias) : null,
    // Si es de un solo día, ya está dicho en el título ("Hoy martes").
    b.dias.length > 1 ? textoDias(b.dias) : null,
    // El tope es del banco, no de la persona: se ve aunque el ojo esté cerrado.
    b.tope ? `tope ${conMontosVisibles(() => clp(b.tope))}` : null,
    b.hasta ? `hasta el ${fechaCorta(b.hasta)}` : null,
  ].filter(Boolean).join(' · ');
  return `<li><a class="fila" href="${esc(b.fuente)}" target="_blank" rel="noopener noreferrer">
    <span class="icono-cat" aria-hidden="true">${RUBROS[b.rubro] || '🏷️'}</span>
    <span class="fila-texto"><b>${esc(b.comercio)}</b><small>${esc(detalle)}</small>${b.nota ? `<small class="nota">${esc(b.nota)}</small>` : ''}${cupo ? `<small class="estado-texto" data-estado="excedido">${esc(cupo)}</small>` : ''}</span>
    <span class="descuento">${esc(b.descuento)}</span>
    <span class="sr-only">(abre la página del banco)</span>
  </a></li>`;
}

// Guardada antes de que existieran los tipos: se puede completar sin quitarla.
const faltaTipo = c => !c.producto && Boolean(TIPOS[c.institucion]);

export function render() {
  const hoy = hoyISO();
  const diaHoy = diaSemana(hoy);
  const dia = diaElegido ?? diaHoy;
  // La próxima vez que toca ese día, contando hoy: así se descartan los que ya vencieron.
  const fecha = sumarDias(hoy, (dia - diaHoy + 7) % 7);
  const mias = misTarjetas();
  const eligiendo = estaEligiendo();
  const lista = beneficiosDelDia(mias.map(claveDe), fecha);
  const delDia = lista.filter(b => b.dias.length);
  const siempre = lista.filter(b => !b.dias.length);
  const tituloDia = dia === diaHoy ? `Hoy ${DIAS[dia - 1]}` : `El ${DIAS[dia - 1]} ${fechaCorta(fecha)}`;

  return `
    <section class="tarjeta">
      <div class="titulo-con-accion"><h2>Mis tarjetas</h2>${eligiendo ? '' : '<button class="boton pequeño" id="agregar-tarjeta">+ Agregar</button>'}</div>
      ${mias.length ? `<ul class="mis-tarjetas">${mias.map(c => `
        <li>
          ${dibujoTarjeta(c)}
          <span class="mis-tarjetas-pie"><b>${esc(nombreTarjeta(c))}</b><span class="mis-tarjetas-acciones">${faltaTipo(c)
            ? `<button class="boton-texto" data-completar="${esc(c.id)}">Elegir tipo</button>`
            : `<button class="boton-texto" data-editar="${esc(c.id)}">Editar</button>`}<button class="boton-texto" data-quitar="${esc(c.id)}">Quitar</button></span></span>
        </li>`).join('')}</ul>`
      : eligiendo ? '' : '<p class="ayuda">Agrega las tarjetas que tienes y te muestro en qué tienes descuento cada día.</p>'}
      ${elegirHTML()}
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
  montarElegir(raiz, { refrescar, avisarError: m => avisar(m, 'error') });
  raiz.querySelector('#agregar-tarjeta')?.addEventListener('click', () => { empezarAElegir(); refrescar(); });
  // Una tarjeta guardada solo con el banco: elegir el tipo la completa en su lugar.
  raiz.querySelectorAll('[data-completar]').forEach(b => b.addEventListener('click', () => {
    empezarAElegir(b.dataset.completar, 'tipo');
    refrescar();
  }));
  raiz.querySelectorAll('[data-editar]').forEach(b => b.addEventListener('click', () => {
    empezarAElegir(b.dataset.editar);
    refrescar();
  }));
  raiz.querySelectorAll('[data-quitar]').forEach(b => b.addEventListener('click', async () => {
    const c = cuentaPorId(b.dataset.quitar);
    if (!c) return;
    const deuda = deudaDe(c);
    if (deuda && !(await confirmar(`Tu deuda "${deuda.nombre}" queda anotada, pero sin tarjeta. ¿Quitar la ${nombreTarjeta(c)}?`))) return;
    ejecutar(() => quitarTarjeta(c.id), null, refrescar);
  }));
  raiz.querySelectorAll('[data-dia]').forEach(b => b.addEventListener('click', () => {
    diaElegido = Number(b.dataset.dia);
    refrescar();
  }));
}
