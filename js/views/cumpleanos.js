import { datos, guardarPerfil } from '../db.js';
import { REVISADO, TIPOS_CUMPLE, CUANDO_CUMPLE, rutaDelCumple, rutaDelAnio, regalosDe, filtrarRegalos } from '../cumpleanos.js';
import { nacimiento, NACIMIENTO_MINIMO, MENSAJE_FECHA } from '../validar.js';
import { ejecutar, avisar } from '../ui.js';
import { esc, hoyISO, fechaCorta, nombreMes, sumarDias } from '../util.js';

export const titulo = 'Tu cumpleaños';

// Filtros y filas abiertas: viven mientras la app está abierta, para que al
// marcar algo no se cierre la fila ni se pierda lo que estabas mirando. Si
// cambia la fecha (otra cuenta u otro cumpleaños) parten de cero.
let filtroTipo = null;
let filtroCuando = null;
let sinInscribirse = false;
let verTodos = false;
let abiertos = new Set();
let estadoDe = null;
const PRIMEROS = 8; // en Explorar se ven estos y un botón para el resto

function estadoPara(clave) {
  if (clave === estadoDe) return;
  estadoDe = clave;
  filtroTipo = filtroCuando = null;
  sinInscribirse = verTodos = false;
  abiertos = new Set();
}

// Cuándo vale, con fechas: "Tu semana" solo no dice desde qué día.
function ventana(b, cumple) {
  if (b.cuando === 'dia') return `Vale solo el ${fechaCorta(cumple)}.`;
  if (b.cuando === 'semana') return `Vale del ${fechaCorta(cumple)} al ${fechaCorta(sumarDias(cumple, 7))}.`;
  return `Vale en ${nombreMes(cumple.slice(0, 7), false)}: revisa desde qué día, cada marca lo pone distinto.`;
}
const CHEVRON = '<svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

const anioDe = fecha => Number(fecha.slice(0, 4));

function cuentaRegresiva(dias, cumple) {
  if (dias === 0) return '¡Hoy es tu cumpleaños! 🎉';
  if (dias < 0) return `Tu cumpleaños fue el ${fechaCorta(cumple)}, pero tu mes sigue: aprovecha lo que te queda.`;
  return `Faltan ${dias} ${dias === 1 ? 'día' : 'días'} para tu cumpleaños, el ${fechaCorta(cumple)}.`;
}

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

// Una fila de una línea (marca, regalo, cuándo vale y si pide inscribirse) que
// al abrirla muestra la letra chica, de dónde sale el dato y las dos casillas:
// "En mi ruta" para juntarlo arriba y "Ya lo usé" para tacharlo. Lo de
// inscribirse se destaca solo mientras alcanzas (antes de tu cumpleaños).
function filaRegalo(b, ruta, r) {
  const o = origen(b);
  const elegido = ruta.elegidos.includes(b.id);
  const usado = ruta.usados.includes(b.id);
  const alcanzas = r.dias > 0;
  const detalle = [ventana(b, r.cumple), b.condiciones, b.llevar ? `Lleva: ${b.llevar}` : null, b.donde].filter(Boolean);
  const etiqueta = usado ? '<span class="etiqueta pagada">Usado</span>'
    : b.antes && alcanzas ? '<span class="etiqueta pendiente">Pide inscribirse</span>' : '';
  return `<li class="regalo${usado ? ' usado' : ''}">
    <details data-regalo="${esc(b.id)}"${abiertos.has(b.id) ? ' open' : ''}>
      <summary>
        <span class="icono-cat" aria-hidden="true">${esc(b.icono)}</span>
        <span class="regalo-linea">
          <span class="regalo-titulo"><b>${esc(b.marca)}</b> <span class="regalo-que">${esc(b.regalo)}</span></span>
          <small>${CUANDO_CUMPLE[b.cuando]} ${etiqueta}</small>
        </span>
        ${CHEVRON}
      </summary>
      <div class="regalo-texto">
        ${b.antes ? `<p class="regalo-antes${alcanzas ? '' : ' tarde'}"><b>${alcanzas ? 'Hazlo antes' : 'Pedía inscribirse antes'}:</b> ${esc(b.antes)}</p>` : ''}
        ${detalle.map(d => `<small>${esc(d)}</small>`).join('')}
        <small class="origen ${o.clase}">${esc(o.etiqueta)}</small>
        <a class="enlace" href="${esc(b.fuente)}" target="_blank" rel="noopener noreferrer">${o.enlace}<span class="sr-only"> de ${esc(b.marca)} (abre otra página)</span></a>
        <div class="regalo-acciones">
          <label><input type="checkbox" data-elegir="${esc(b.id)}"${elegido ? ' checked' : ''}> En mi ruta</label>
          <label><input type="checkbox" data-usar="${esc(b.id)}"${usado ? ' checked' : ''}> Ya lo usé</label>
        </div>
      </div>
    </details>
  </li>`;
}

const chip = (atributo, valor, texto, activo) =>
  `<button type="button" class="chip" data-${atributo}="${valor}" aria-pressed="${activo}">${texto}</button>`;

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
  estadoPara(fecha + r.cumple);
  const ruta = rutaDelAnio(datos.perfil.ruta_cumpleanos, anioDe(r.cumple));
  // Solo cuenta lo que sigue en el catálogo y todavía vale.
  const todos = regalosDe(r);
  const enRuta = filtrarRegalos(todos.filter(b => ruta.elegidos.includes(b.id)));
  const usados = enRuta.filter(b => ruta.usados.includes(b.id)).length;
  // Lo que pide inscribirse antes (r.antes ya viene vacío desde el día del
  // cumpleaños): el mismo conteo que el aviso de Inicio.
  const pendientes = r.antes.filter(b => !ruta.usados.includes(b.id));
  const pendientesEnRuta = pendientes.filter(b => ruta.elegidos.includes(b.id)).length;
  const pendientesFuera = pendientes.length - pendientesEnRuta;

  // Explorar: lo que todavía no está en tu ruta, con los filtros puestos.
  const resto = todos.filter(b => !ruta.elegidos.includes(b.id));
  const tipos = Object.keys(TIPOS_CUMPLE).filter(t => resto.some(b => b.tipo === t));
  const cuandos = Object.keys(CUANDO_CUMPLE).filter(c => resto.some(b => b.cuando === c));
  const tipo = tipos.includes(filtroTipo) ? filtroTipo : null;
  const cuando = cuandos.includes(filtroCuando) ? filtroCuando : null;
  const lista = filtrarRegalos(resto, { tipo, cuando, sinInscribirse });
  const hayFiltros = tipo || cuando || sinInscribirse;
  const cortar = !verTodos && lista.length > PRIMEROS + 2;
  const visibles = cortar ? lista.slice(0, PRIMEROS) : lista;

  return `
    <section class="tarjeta hero hero-salvia">
      <p class="hero-etiqueta">Tu ruta del cumpleañero</p>
      <p class="hero-detalle"><b>${esc(cuentaRegresiva(r.dias, r.cumple))}</b></p>
      <p class="hero-detalle">${todos.length
        ? `${todos.length} ${todos.length === 1 ? 'regalo' : 'regalos'} para ti${enRuta.length ? ` · ${enRuta.length} en tu ruta${usados ? ` · ${usados} ya ${usados === 1 ? 'usado' : 'usados'}` : ''}` : ''}.`
        : 'Por ahora no encontramos regalos para tu fecha.'}</p>
    </section>

    ${todos.length ? `<section class="tarjeta">
      <h2>Tu ruta${enRuta.length ? ` <span class="contador">${enRuta.length}</span>` : ''}</h2>
      ${enRuta.length
        ? `${pendientesEnRuta ? `<p class="aviso-ruta">${pendientesEnRuta === 1 ? 'Uno de tu ruta pide' : `${pendientesEnRuta} de tu ruta piden`} inscribirse antes: ábrelos y hazlo ya.</p>` : ''}
          <ul class="lista regalos">${enRuta.map(b => filaRegalo(b, ruta, r)).join('')}</ul>`
        : '<p class="ayuda">Abre un regalo de abajo y marca "En mi ruta": aquí quedan juntos los que quieres usar.</p>'}
    </section>` : ''}

    ${resto.length ? `<section class="tarjeta">
      <h2>Explorar <span class="contador">${resto.length}</span></h2>
      ${pendientesFuera ? `<p class="aviso-ruta">${pendientesFuera === 1 ? 'Uno pide' : `${pendientesFuera} piden`} inscribirse antes de tu cumpleaños: ${pendientesFuera === 1 ? 'tiene' : 'tienen'} la etiqueta "Pide inscribirse". Si te interesa${pendientesFuera === 1 ? '' : 'n'}, hazlo con tiempo.</p>` : ''}
      <div class="filtros-cumple">
        <div class="chips" role="group" aria-label="Tipo de regalo">
          ${chip('tipo', '', 'Todos', !tipo)}${tipos.map(t => chip('tipo', t, TIPOS_CUMPLE[t], tipo === t)).join('')}
        </div>
        <div class="chips" role="group" aria-label="Cuándo vale">
          ${chip('cuando', '', 'Cuando sea', !cuando)}${cuandos.map(c => chip('cuando', c, CUANDO_CUMPLE[c], cuando === c)).join('')}
        </div>
        <label class="interruptor"><input type="checkbox" id="sin-inscribirse"${sinInscribirse ? ' checked' : ''}> Solo los que no piden inscribirse</label>
      </div>
      ${lista.length
        ? `<ul class="lista regalos">${visibles.map(b => filaRegalo(b, ruta, r)).join('')}</ul>`
        : '<p class="ayuda">No hay regalos con esos filtros.</p>'}
      ${cortar ? `<button type="button" class="boton" id="ver-mas">Ver los ${lista.length - PRIMEROS} que faltan</button>` : ''}
      ${hayFiltros ? '<button type="button" class="boton-texto" id="quitar-filtros">Quitar filtros</button>' : ''}
    </section>` : ''}

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

  // Cambiar un filtro vuelve a mostrar solo los primeros.
  const filtrar = cambio => () => { cambio(); verTodos = false; refrescar(); };
  raiz.querySelectorAll('[data-tipo]').forEach(b => b.addEventListener('click', filtrar(() => { filtroTipo = b.dataset.tipo || null; })));
  raiz.querySelectorAll('[data-cuando]').forEach(b => b.addEventListener('click', filtrar(() => { filtroCuando = b.dataset.cuando || null; })));
  raiz.querySelector('#sin-inscribirse')?.addEventListener('change', filtrar(() => { sinInscribirse = !sinInscribirse; }));
  raiz.querySelector('#quitar-filtros')?.addEventListener('click', filtrar(() => { filtroTipo = filtroCuando = null; sinInscribirse = false; }));
  raiz.querySelector('#ver-mas')?.addEventListener('click', () => { verTodos = true; refrescar(); });
  raiz.querySelectorAll('[data-regalo]').forEach(d => d.addEventListener('toggle', () => {
    if (d.open) abiertos.add(d.dataset.regalo); else abiertos.delete(d.dataset.regalo);
  }));

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
    // La fila puede cambiar de tarjeta (de Explorar a Tu ruta): el foco la sigue.
    const atributo = lista === 'elegidos' ? 'data-elegir' : 'data-usar';
    ejecutar(() => guardarPerfil({ ruta_cumpleanos: { anio, elegidos: [...elegidos], usados: [...usados] } }), null, () => {
      refrescar();
      document.querySelector(`[${atributo}="${CSS.escape(id)}"]`)?.focus();
    });
  };
  raiz.querySelectorAll('[data-elegir]').forEach(c => c.addEventListener('change', () => cambiar(c.dataset.elegir, 'elegidos', c.checked)));
  raiz.querySelectorAll('[data-usar]').forEach(c => c.addEventListener('change', () => cambiar(c.dataset.usar, 'usados', c.checked)));
}
