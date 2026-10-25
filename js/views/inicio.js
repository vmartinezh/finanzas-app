import { datos, guardar } from '../db.js';
import { disponibleDelMes, compromisosPendientes, gastoPorCategoria, estadoPresupuesto, acumuladoDiario, usoCupo, tocaRevision, cobrosDeHoy } from '../calculos.js';
import { graficoRitmo } from '../graficos.js';
import { ejecutar, barraProgreso, ICONO_ESTADO, contarHasta, sinMovimiento } from '../ui.js';
import { clp, esc, mesActual, nombreMes, hoyISO, porcentaje, montosOcultos, NOMBRE_APP } from '../util.js';
import { filaMovimiento, montarFilas, esTransferencia } from './movimientos.js';
import { clasificar, aprender } from '../clasificador.js';
import { filaBeneficio } from './beneficios.js';
import { registrarPago } from './cobros.js';
import { beneficiosDelDia, diaSemana, DIAS } from '../beneficios.js';

export const titulo = NOMBRE_APP;

// Lo que llegó solo y la app ya sabe clasificar por el comercio se confirma con
// un toque. Una transferencia solo se sugiere si ya la clasificaste antes a esa
// misma persona: por palabras clave, "Transferencia a Juan Flores" sería Regalos.
function sugerencia(m) {
  if (m.tipo !== 'gasto' || !m.comercio) return null;
  const s = clasificar({ comercio: m.comercio });
  if (!s.categoria_id || (esTransferencia(m) && s.motivo !== 'como la última vez')) return null;
  return datos.categorias.find(c => c.id === s.categoria_id) ? s : null;
}

function botonConfirmar(s) {
  const cat = s && datos.categorias.find(c => c.id === s.categoria_id);
  if (!cat) return '';
  return `<button class="boton pequeño confirmar" data-confirmar="${esc(cat.id)}" data-evento="${esc(s.evento_id || '')}" aria-label="Confirmar en ${esc(cat.nombre)}">✓ ${esc(cat.icono)} ${esc(cat.nombre)}</button>`;
}

// Confirma lo que muestran los botones (no lo que se calcule después) y aprende
// cada comercio una sola vez.
async function confirmarSugerencias(botones) {
  const elegidos = botones.map(b => ({
    m: datos.movimientos.find(x => x.id === b.closest('li').querySelector('[data-mov]').dataset.mov),
    categoria_id: b.dataset.confirmar,
    evento_id: b.dataset.evento || null,
  })).filter(x => x.m?.estado === 'pendiente');
  await Promise.all(elegidos.map(({ m, categoria_id, evento_id }) =>
    guardar('movimientos', { ...m, categoria_id, evento_id: m.evento_id || evento_id, estado: 'clasificado' })));
  const porComercio = new Map(elegidos.map(x => [x.m.comercio, x.categoria_id]));
  for (const [comercio, categoria_id] of porComercio) await aprender(comercio, categoria_id);
  return elegidos.length;
}

export function render() {
  const mes = mesActual();
  const d = disponibleDelMes(mes);
  const pendientes = datos.movimientos.filter(m => m.estado === 'pendiente').sort((a, b) => b.fecha.localeCompare(a.fecha));
  const visibles = pendientes.slice(0, 5).map(m => ({ m, s: sugerencia(m) }));
  const sugeridas = visibles.filter(x => x.s);
  const porPagar = compromisosPendientes(mes);
  const hoy = Number(hoyISO().slice(8));
  const sinConfigurar = !datos.perfil.ingreso_mensual;

  const gastos = gastoPorCategoria(mes);
  const alertas = datos.categorias
    .filter(c => c.tope_mensual > 0)
    .map(c => ({ c, gastado: gastos.get(c.id) || 0 }))
    .map(x => ({ ...x, estado: estadoPresupuesto(x.gastado, x.c.tope_mensual) }))
    .filter(x => x.estado !== 'ok')
    .sort((a, b) => b.gastado / b.c.tope_mensual - a.gastado / a.c.tope_mensual);

  const enRojo = d.restante < 0;
  const tarjetasAltas = datos.deudas.filter(x => x.saldo > 0 && usoCupo(x)?.estado === 'excedido');
  const revision = tocaRevision();
  const porCobrar = cobrosDeHoy();
  const cobranHoy = porCobrar.some(x => x.e.situacion === 'hoy');
  // Descuentos que son solo de hoy: los de todos los días no son noticia.
  const tarjetasElegidas = (datos.perfil.tarjetas || []).length > 0;
  const descuentosHoy = beneficiosDelDia(datos.perfil.tarjetas || [], hoyISO()).filter(b => b.dias.length);
  const masCara =datos.deudas.filter(x => x.saldo > 0 && x.estado !== 'pausa').sort((a, b) => (b.cae || 0) - (a.cae || 0))[0];

  // ¿Va al ritmo? Lo gastado contra lo que "tocaba" gastar hasta hoy.
  const diaDelMes = d.totalDias - d.diasRestantes + 1;
  const ideal = d.paraVariable * diaDelMes / d.totalDias;
  const adelantado = d.gastado - ideal;

  return `
    <section class="tarjeta hero hero-salvia" aria-labelledby="titulo-disponible">
      <p class="hero-etiqueta" id="titulo-disponible">${enRojo ? 'Este mes se fue más de lo planeado' : 'Hoy puedes gastar'}</p>
      <p class="hero-numero"${montosOcultos() ? '' : ` data-valor="${Math.round(enRojo ? -d.restante : d.porDia)}" data-tipo="${enRojo ? 'rojo' : 'por-dia'}"`}>${clp(enRojo ? -d.restante : d.porDia)}</p>
      <p class="hero-detalle">${enRojo
        ? 'Lo que gastes desde ahora sale del ahorro o de deuda. Mañana partimos de nuevo: anota lo justo y el próximo mes se ordena.'
        : `Te quedan <b>${clp(d.restante)}</b> para ${d.diasRestantes} ${d.diasRestantes === 1 ? 'día' : 'días'} de ${esc(nombreMes(mes, false))}.`}</p>
      ${!enRojo && d.paraVariable > 0 ? `
        <div class="estado-ritmo">
          ${adelantado <= 0
            ? '<b><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>Vas al ritmo del mes</b>'
            : `<b><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4.5M12 16h.01"/></svg>Vas ${clp(adelantado)} sobre el ritmo</b>`}
          <span>día ${diaDelMes} de ${d.totalDias}</span>
        </div>` : ''}
      <details class="desglose">
        <summary>¿De dónde sale este número?</summary>
        <dl>
          <div><dt>Ingreso del mes</dt><dd>${clp(d.ingreso)}</dd></div>
          <div><dt>− Pagos fijos</dt><dd>${clp(d.fijos)}</dd></div>
          <div><dt>− Cuotas de deudas</dt><dd>${clp(d.cuotas)}</dd></div>
          ${d.extraDeudas ? `<div><dt>− Abono extra a deudas</dt><dd>${clp(d.extraDeudas)}</dd></div>` : ''}
          ${d.ahorro ? `<div><dt>− Ahorro</dt><dd>${clp(d.ahorro)}</dd></div>` : ''}
          <div class="subtotal"><dt>= Para el día a día</dt><dd>${clp(d.paraVariable)}</dd></div>
          <div><dt>− Ya gastado</dt><dd>${clp(d.gastado)}</dd></div>
          ${d.cobrado ? `<div><dt>+ Te devolvieron</dt><dd>${clp(d.cobrado)}</dd></div>` : ''}
          <div class="subtotal"><dt>= Te queda</dt><dd>${clp(d.restante)}</dd></div>
        </dl>
      </details>
    </section>

    ${revision.pendiente ? `
      <a class="tarjeta destacada enlace-tarjeta" href="#/revision">
        <h2>Toca la revisión de ${esc(nombreMes(revision.mesARevisar, false))}</h2>
        <p>Diez minutos para confirmar pagos, actualizar saldos y ver que el plan va bien.</p>
      </a>` : ''}

    ${tarjetasAltas.map(t => `
      <section class="tarjeta alerta-tarjeta">
        <h2>${esc(t.nombre)} está sobre el 85% del cupo</h2>
        <p>Usas el ${Math.round(usoCupo(t).pct)}%. Déjala descansar para el día a día hasta que baje.</p>
      </section>`).join('')}

    ${porCobrar.length ? `
      <section class="tarjeta">
        <h2>${cobranHoy ? 'Hoy te pagan' : 'Te tienen que pagar'}</h2>
        <ul class="lista">${porCobrar.slice(0, 4).map(({ c, e, persona }) => `
          <li class="fila fila-estatica">
            <span class="fila-texto"><b>${esc(persona.nombre)}</b><small>${esc(c.concepto)}${e.cuotas > 1 ? ` · cuota ${e.proxima.numero} de ${e.cuotas}` : ''} · ${e.situacion === 'hoy' ? '<span class="etiqueta pendiente">Vence hoy</span>' : '<span class="etiqueta atrasado">Atrasado</span>'}</small></span>
            <span class="monto">${clp(Math.max(e.vencido, e.proxima.monto))}</span>
            <button class="boton pequeño" data-pagar-cobro="${c.id}">Me pagó</button>
          </li>`).join('')}</ul>
        <a class="enlace" href="#/cobros">${porCobrar.length > 4 ? `Ver los ${porCobrar.length}` : 'Ver todo lo que te deben'}</a>
      </section>` : ''}

    ${sinConfigurar ? `
      <section class="tarjeta destacada">
        <h2>Partamos por lo básico</h2>
        <p>Cuéntame cuánto te entra al mes y tus pagos fijos, y te digo cuánto puedes gastar cada día.</p>
        <a class="boton primario" href="#/ajustes">Configurar mi mes</a>
      </section>` : ''}

    ${tarjetasElegidas && descuentosHoy.length ? `
      <section class="tarjeta">
        <h2>Hoy ${DIAS[diaSemana(hoyISO()) - 1]} tienes descuento en</h2>
        <ul class="lista">${descuentosHoy.slice(0, 4).map(b => filaBeneficio(b)).join('')}</ul>
        <a class="enlace" href="#/beneficios">${descuentosHoy.length > 4 ? `Ver los ${descuentosHoy.length}` : 'Ver la semana'}</a>
      </section>` : ''}

    ${d.ingresosExtra ? `
      <section class="tarjeta">
        <h2>Plata extra este mes: ${clp(d.ingresosExtra)}</h2>
        <p class="ayuda">No la sumé a lo que puedes gastar.${masCara?.cae ? ` Donde más rinde es abonándola a <b>${esc(masCara.nombre)}</b> (CAE ${porcentaje(masCara.cae)}), o guardándola como fondo de emergencia.` : ' Puedes guardarla como fondo de emergencia.'}</p>
      </section>` : ''}

    ${pendientes.length ? `
      <section class="tarjeta">
        <h2>Por revisar <span class="contador">${pendientes.length}</span></h2>
        <p class="ayuda">${sugeridas.length ? 'Lo que llegó solo. Si la categoría está bien, tócala; si no, toca el movimiento y cuéntame qué fue.' : 'Lo que llegó solo, sin contexto. Tócalo y cuéntame qué fue.'}</p>
        <ul class="lista">${visibles.map(({ m, s }) => filaMovimiento(m, botonConfirmar(s))).join('')}</ul>
        <div class="botones">
          ${sugeridas.length > 1 ? `<button class="boton secundario" data-confirmar-todas>Confirmar las ${sugeridas.length} sugeridas</button>` : ''}
          ${pendientes.length > 5 ? '<a class="enlace" href="#/movimientos">Ver todas</a>' : ''}
        </div>
      </section>` : ''}

    ${alertas.length ? `
      <section class="tarjeta">
        <h2>Para tener en cuenta</h2>
        <ul class="lista-presupuesto">${alertas.map(({ c, gastado, estado }) => `
          <li>
            <div class="fila-presupuesto"><span>${esc(c.icono)} ${esc(c.nombre)}</span><span>${clp(gastado)} de ${clp(c.tope_mensual)}</span></div>
            ${barraProgreso(gastado, c.tope_mensual, estado)}
            <small class="estado-texto" data-estado="${estado}">${ICONO_ESTADO[estado]}</small>
          </li>`).join('')}
        </ul>
      </section>` : ''}

    ${porPagar.length ? `
      <section class="tarjeta">
        <h2>Pagos fijos de ${esc(nombreMes(mes, false))}</h2>
        <ul class="lista">${porPagar.map(c => {
          const atrasado = c.dia_pago && c.dia_pago < hoy;
          return `<li class="fila fila-estatica">
            <span class="fila-texto"><b>${esc(c.nombre)}</b><small>${c.dia_pago ? `Vence el ${c.dia_pago}` : 'Sin día fijo'}${atrasado ? ' · <span class="etiqueta atrasado">Atrasado</span>' : ''}</small></span>
            <span class="monto">${clp(c.monto)}</span>
            <button class="boton pequeño" data-pagar="${c.id}">Pagado</button>
          </li>`;
        }).join('')}</ul>
      </section>` : ''}

    ${d.paraVariable > 0 ? `
      <section class="tarjeta">
        <h2>¿Vas al ritmo?</h2>
        <p class="ayuda">Si la línea verde pasa por arriba de la punteada, vas gastando más rápido de lo que alcanza el mes.</p>
        ${graficoRitmo({ acumulado: acumuladoDiario(mes), presupuesto: d.paraVariable, totalDias: d.totalDias }).html}
      </section>` : ''}

    ${!tarjetasElegidas && !sinConfigurar ? `
      <a class="tarjeta enlace-tarjeta" href="#/beneficios">
        <h2>¿En qué tienes descuento hoy?</h2>
        <p class="ayuda">Agrega tus tarjetas y te muestro sus descuentos de cada día, como el 40% de los jueves en Burger King con Santander.</p>
      </a>` : ''}
  `;
}

// El último número del día que se mostró, para contar desde ahí cuando cambia.
// Solo se compara con uno del mismo día y del mismo tipo: en rojo el número es
// lo que te pasaste, no lo que puedes gastar.
let anterior = null;

function animarNumero(el) {
  const actual = el?.dataset.valor === undefined ? null
    : { valor: Number(el.dataset.valor), tipo: el.dataset.tipo, dia: hoyISO() };
  const comparable = actual && anterior && anterior.tipo === actual.tipo && anterior.dia === actual.dia;
  if (comparable && actual.valor !== anterior.valor && !sinMovimiento()) {
    contarHasta(el, anterior.valor, actual.valor);
    // Si entró plata (puedes gastar más hoy), la moneda brilla junto al número.
    if (actual.tipo === 'por-dia' && actual.valor > anterior.valor) el.classList.add('sube');
  }
  anterior = actual;
}

export function montar(raiz, refrescar) {
  animarNumero(raiz.querySelector('.hero-numero'));
  montarFilas(raiz, refrescar);
  // Los botones se apagan al primer toque: un doble toque no confirma dos veces.
  const confirmar = (botones, mensaje) => {
    botones.forEach(b => { b.disabled = true; });
    ejecutar(() => confirmarSugerencias(botones), mensaje, refrescar);
  };
  raiz.querySelectorAll('[data-confirmar]').forEach(b => b.addEventListener('click', () => {
    const cat = datos.categorias.find(c => c.id === b.dataset.confirmar);
    confirmar([b], `Listo, en ${cat.icono} ${cat.nombre}`);
  }));
  raiz.querySelector('[data-confirmar-todas]')?.addEventListener('click', e => {
    const botones = [...raiz.querySelectorAll('[data-confirmar]')];
    e.currentTarget.disabled = true;
    confirmar(botones, `Listo, ${botones.length} confirmados`);
  });
  raiz.querySelectorAll('[data-pagar-cobro]').forEach(b => b.addEventListener('click', () => registrarPago(datos.cobros.find(c => c.id === b.dataset.pagarCobro), refrescar)));
  raiz.querySelectorAll('[data-pagar]').forEach(b => b.addEventListener('click', () => {
    const c = datos.compromisos.find(x => x.id === b.dataset.pagar);
    ejecutar(() => guardar('compromisos', { ...c, pagados: [...(c.pagados || []), mesActual()] }), `${c.nombre}: marcado como pagado`, refrescar);
  }));
}
