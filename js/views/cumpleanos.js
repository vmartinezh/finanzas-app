import { datos, guardarPerfil } from '../db.js';
import { REVISADO, rutaDelCumple, rutaDelAnio, regalosDe } from '../cumpleanos.js';
import { nacimiento, NACIMIENTO_MINIMO, MENSAJE_FECHA } from '../validar.js';
import { ejecutar, avisar } from '../ui.js';
import { esc, hoyISO, fechaCorta, nombreMes } from '../util.js';

export const titulo = 'Tu cumpleaños';

const anioDe = fecha => Number(fecha.slice(0, 4));

function cuentaRegresiva(dias, cumple) {
  if (dias === 0) return '¡Hoy es tu cumpleaños! 🎉';
  if (dias < 0) return `Tu cumpleaños fue el ${fechaCorta(cumple)}, pero tu mes sigue: aprovecha lo que te queda.`;
  return `Faltan ${dias} ${dias === 1 ? 'día' : 'días'} para tu cumpleaños, el ${fechaCorta(cumple)}.`;
}

// Primero lo confirmado en la web de la marca; después lo visto en prensa.
const porOrigen = lista => [...lista].sort((a, b) => (a.segun === 'web' ? 0 : 1) - (b.segun === 'web' ? 0 : 1));

// De dónde sale el dato, para que cada persona decida si le cree.
const origen = b => (b.segun === 'web'
  ? { etiqueta: 'Confirmado en su web', enlace: 'Ver condiciones', clase: 'web' }
  : { etiqueta: `Visto en prensa (${b.visto ? nombreMes(b.visto) : 'sin fecha'})${notaVieja(b) ? ', hace más de un año: puede que ya no exista' : ''}. Confírmalo en su app o en el local.`, enlace: 'Ver la nota', clase: 'prensa' });

// Una nota de hace más de un año puede estar desactualizada: se dice.
function notaVieja(b) {
  if (!b.visto) return true;
  const [a, m] = hoyISO().split('-').map(Number);
  const [va, vm] = b.visto.split('-').map(Number);
  return (a - va) * 12 + (m - vm) > 12;
}

// Una fila por regalo: lo que dan, qué llevar, de dónde sale el dato y su link;
// dos casillas para armar la ruta (lo quiero) y tacharlo (ya lo usé).
function filaRegalo(b, ruta) {
  const o = origen(b);
  const elegido = ruta.elegidos.includes(b.id);
  const usado = ruta.usados.includes(b.id);
  const detalle = [b.condiciones, b.llevar ? `Lleva: ${b.llevar}` : null, b.donde].filter(Boolean);
  return `<li class="regalo${usado ? ' usado' : ''}">
    <span class="icono-cat" aria-hidden="true">${esc(b.icono)}</span>
    <div class="regalo-texto">
      <b>${esc(b.marca)}</b>
      <span class="regalo-que">${esc(b.regalo)}</span>
      ${detalle.map(d => `<small>${esc(d)}</small>`).join('')}
      <small class="origen ${o.clase}">${esc(o.etiqueta)}</small>
      <a class="enlace" href="${esc(b.fuente)}" target="_blank" rel="noopener noreferrer">${o.enlace}<span class="sr-only"> de ${esc(b.marca)} (abre otra página)</span></a>
      <div class="regalo-acciones">
        <label><input type="checkbox" data-elegir="${esc(b.id)}" ${elegido ? 'checked' : ''}> En mi ruta</label>
        <label><input type="checkbox" data-usar="${esc(b.id)}" ${usado ? 'checked' : ''}> Ya lo usé</label>
      </div>
    </div>
  </li>`;
}

function grupo(tituloGrupo, ayuda, lista, ruta) {
  if (!lista.length) return '';
  return `<section class="tarjeta">
    <h2>${tituloGrupo}</h2>
    <p class="ayuda">${ayuda}</p>
    <ul class="lista regalos">${porOrigen(lista).map(b => filaRegalo(b, ruta)).join('')}</ul>
  </section>`;
}

export function render() {
  const hoy = hoyISO();
  const fecha = datos.perfil.fecha_nacimiento;
  if (!fecha) {
    return `<section class="tarjeta">
      <h2>Tu ruta del cumpleañero 🎂</h2>
      <p>Hay marcas que te regalan algo en tu cumpleaños: un café, entradas al cine, cupones. Con tu fecha de nacimiento te armo la lista y te aviso dos semanas antes, para que alcances a inscribirte donde haga falta.</p>
      <form id="form-fecha-cumple">
        <label class="campo"><span>Fecha de nacimiento</span>
          <input type="date" name="fecha" required min="${NACIMIENTO_MINIMO}" max="${hoy}">
          <small>No se muestra en ninguna parte: solo sirve para esto.</small>
        </label>
        <button class="boton primario">Armar mi ruta</button>
      </form>
    </section>`;
  }

  const r = rutaDelCumple(fecha, hoy);
  const ruta = rutaDelAnio(datos.perfil.ruta_cumpleanos, anioDe(r.cumple));
  // Solo cuenta lo que sigue en el catálogo y todavía vale.
  const ids = regalosDe(r).map(b => b.id);
  const total = ids.length;
  const enRuta = ruta.elegidos.filter(id => ids.includes(id)).length;
  const usados = ruta.usados.filter(id => ids.includes(id)).length;

  return `
    <section class="tarjeta hero hero-salvia">
      <p class="hero-etiqueta">Tu ruta del cumpleañero</p>
      <p class="hero-detalle"><b>${esc(cuentaRegresiva(r.dias, r.cumple))}</b></p>
      <p class="hero-detalle">${total
        ? `${total} ${total === 1 ? 'regalo' : 'regalos'} para ti${enRuta ? ` · ${enRuta} en tu ruta${usados ? ` · ${usados} ya ${usados === 1 ? 'usado' : 'usados'}` : ''}` : ''}.`
        : 'Por ahora no encontramos regalos para tu fecha.'}</p>
    </section>

    ${r.antes.length ? `<section class="tarjeta destacada">
      <h2>Hazlo antes</h2>
      <p class="ayuda">Estos regalos solo llegan si te inscribiste antes. Mejor hacerlo ya.</p>
      <ul class="lista antes">${porOrigen(r.antes).map(b => `<li><b>${esc(b.icono)} ${esc(b.marca)}:</b> ${esc(b.antes)}</li>`).join('')}</ul>
    </section>` : ''}

    ${grupo('Tu día', `Solo el ${esc(fechaCorta(r.cumple))}.`, r.dia, ruta)}
    ${grupo('Tu semana', 'Tu día y los 7 siguientes.', r.semana, ruta)}
    ${grupo('Tu mes', 'En el mes de tu cumpleaños: revisa en cada uno desde cuándo vale.', r.mes, ruta)}

    <p class="nota">Lista revisada el ${esc(fechaCorta(REVISADO))}. Ponemos todos los regalos que encontramos: los "confirmados en su web" los dice la página de la marca; los "vistos en prensa" salen de guías de noticias, porque muchas marcas los muestran solo en su app. Cada marca cambia sus condiciones: revisa antes de ir.
      Tu fecha de nacimiento se cambia en <a href="#/ajustes">Ajustes</a>.</p>
  `;
}

export function montar(raiz, refrescar) {
  raiz.querySelector('#form-fecha-cumple')?.addEventListener('submit', ev => {
    ev.preventDefault();
    const fecha_nacimiento = nacimiento(ev.target.fecha.value);
    if (!fecha_nacimiento) return avisar(MENSAJE_FECHA, 'error');
    ejecutar(() => guardarPerfil({ fecha_nacimiento }), 'Listo: esta es tu ruta.', refrescar);
  });

  const fecha = datos.perfil.fecha_nacimiento;
  if (!fecha) return;
  const anio = anioDe(rutaDelCumple(fecha, hoyISO()).cumple);
  // Marcar "ya lo usé" también lo deja en la ruta; sacarlo de la ruta lo desmarca.
  const cambiar = (id, lista, si) => {
    const ruta = rutaDelAnio(datos.perfil.ruta_cumpleanos, anio);
    const elegidos = new Set(ruta.elegidos);
    const usados = new Set(ruta.usados);
    if (lista === 'elegidos' && si) elegidos.add(id);
    if (lista === 'elegidos' && !si) { elegidos.delete(id); usados.delete(id); }
    if (lista === 'usados' && si) { usados.add(id); elegidos.add(id); }
    if (lista === 'usados' && !si) usados.delete(id);
    ejecutar(() => guardarPerfil({ ruta_cumpleanos: { anio, elegidos: [...elegidos], usados: [...usados] } }), null, refrescar);
  };
  raiz.querySelectorAll('[data-elegir]').forEach(c => c.addEventListener('change', () => cambiar(c.dataset.elegir, 'elegidos', c.checked)));
  raiz.querySelectorAll('[data-usar]').forEach(c => c.addEventListener('change', () => cambiar(c.dataset.usar, 'usados', c.checked)));
}
