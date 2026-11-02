import { datos, guardar, borrar, guardarPerfil } from '../db.js';
import { planDeudas, deudasVigentes, deudasEnPausa, destinoDeudas, usoCupo } from '../calculos.js';
import { abrirFormulario, ejecutar, barraProgreso, inputMonto, avisar } from '../ui.js';
import { sugerirTarjeta } from '../beneficios.js';
import { tarjetaHTML, activarTarjetas3D } from '../tarjetas.js';
import { misTarjetas, nombreBanco, nombreTarjeta, deudaDe, empezarAElegir, estaEligiendo, elegirHTML, montarElegir } from '../mis-tarjetas.js';
import { clp, esc, nombreMes, porcentaje, mesActual, sumarMeses, numero, leerMonto } from '../util.js';

export const titulo = 'Tu plan';

let estrategia = 'avalancha';
// Calces deuda ↔ tarjeta que la persona dijo que no son (mientras la app está abierta).
const descartados = new Set();

// Tus tarjetas, como en la billetera: el dibujo y, al lado, cuánto te queda
// disponible y cuánto debes. Tocarla abre su deuda (o la anota, si no hay).
function filaTarjeta(id) {
  const d = deudaDe(id);
  const cupo = d ? usoCupo(d) : null;
  let datosHTML;
  if (!d) {
    datosHTML = `<span class="tarjeta-etiqueta">Sin deuda anotada</span><span class="tarjeta-accion">Anota lo que debes y tu cupo</span>`;
  } else if (cupo) {
    datosHTML = `<span class="tarjeta-etiqueta">Disponible</span>
      <span class="monto tarjeta-monto">${clp(Math.max(0, cupo.disponible))}</span>
      ${barraProgreso(d.saldo, d.cupo_total, cupo.estado)}
      <small class="estado-texto" data-estado="${cupo.estado}">Debes ${clp(d.saldo)} de ${clp(d.cupo_total)}</small>`;
  } else {
    datosHTML = `<span class="tarjeta-etiqueta">Debes</span>
      <span class="monto tarjeta-monto">${clp(d.saldo)}</span>
      <span class="tarjeta-accion">Agrega el cupo para ver tu disponible</span>`;
  }
  return `<li><button class="fila-tarjeta" data-tarjeta="${esc(id)}" aria-label="${esc(nombreTarjeta(id))}">
    <span class="tarjeta-marco">${tarjetaHTML(id, nombreBanco(id), { chica: true })}</span>
    <span class="tarjeta-datos">${datosHTML}</span>
  </button></li>`;
}

// Deudas anotadas antes de registrar la tarjeta: se propone unirlas.
function sugerencias(mias) {
  const usadas = new Set(datos.deudas.map(d => d.tarjeta).filter(Boolean));
  return datos.deudas
    .filter(d => !d.tarjeta && !descartados.has(d.id))
    .map(d => ({ d, id: sugerirTarjeta(d, mias) }))
    .filter(({ id }) => id && !usadas.has(id));
}

function tarjetasHTML() {
  const mias = misTarjetas();
  const eligiendo = estaEligiendo();
  const calces = sugerencias(mias);
  return `<section class="tarjeta" id="tus-tarjetas">
    <div class="titulo-con-accion"><h2>Tus tarjetas</h2>${eligiendo ? '' : '<button class="boton pequeño" id="agregar-tarjeta">+ Agregar</button>'}</div>
    ${calces.map(({ d, id }) => `<div class="calce">
      <p>¿Tu deuda <b>${esc(d.nombre)}</b> es tu ${esc(nombreTarjeta(id))}?</p>
      <div class="botones"><button class="boton pequeño" data-calzar="${esc(d.id)}" data-con="${esc(id)}">Sí, es esa</button><button class="boton-texto" data-descartar="${esc(d.id)}">No</button></div>
    </div>`).join('')}
    ${mias.length ? `<ul class="lista-tarjetas">${mias.map(filaTarjeta).join('')}</ul>`
      : eligiendo ? '' : '<p class="ayuda">Agrega tus tarjetas una vez: aquí ves cuánto te queda disponible en cada una, y en Descuentos, qué te sirve hoy.</p>'}
    ${elegirHTML()}
  </section>`;
}

const duracion = meses => {
  if (meses == null) return 'nunca, con estas cuotas';
  const a = Math.floor(meses / 12);
  const m = meses % 12;
  return [a ? `${a} ${a === 1 ? 'año' : 'años'}` : '', m ? `${m} ${m === 1 ? 'mes' : 'meses'}` : ''].filter(Boolean).join(' y ') || 'este mes';
};

function filaDeuda(d) {
  const cupo = usoCupo(d);
  const detalle = d.saldo > 0
    ? [
        d.cuota_mensual ? `Cuota ${clp(d.cuota_mensual)}` : 'Sin cuota fija',
        d.cae ? `CAE ${porcentaje(d.cae)}` : 'Sin interés',
        d.dia_pago ? `día ${d.dia_pago}` : '',
        d.fecha_limite ? `<span class="etiqueta atrasado">Pagar a más tardar en ${esc(nombreMes(d.fecha_limite))}</span>` : '',
      ].filter(Boolean).join(' · ')
    : '<span class="etiqueta pagada">✓ Pagada</span>';
  return `<li><button class="fila fila-columna" data-deuda="${d.id}">
    <span class="fila-linea">
      <span class="fila-texto"><b>${esc(d.nombre)}</b><small>${detalle}</small></span>
      <span class="monto">${clp(d.saldo)}</span>
    </span>
    ${cupo && d.saldo > 0 ? `
      ${barraProgreso(d.saldo, d.cupo_total, cupo.estado)}
      <small class="estado-texto" data-estado="${cupo.estado}">${cupo.estado === 'excedido' ? '⚠ ' : ''}Usas el ${Math.round(cupo.pct)}% del cupo · quedan ${clp(cupo.disponible)}</small>` : ''}
    ${d.notas ? `<small class="nota-deuda">${esc(d.notas)}</small>` : ''}
  </button></li>`;
}

export function render() {
  const vigentes = deudasVigentes().sort((a, b) => (b.cae || 0) - (a.cae || 0) || b.saldo - a.saldo);
  const pausadas = deudasEnPausa();
  const pagadas = datos.deudas.filter(d => !(d.saldo > 0));
  const totalVigente = vigentes.reduce((s, d) => s + d.saldo, 0);
  const totalPausa = pausadas.reduce((s, d) => s + d.saldo, 0);
  const { cuotas, total: aDeudas } = destinoDeudas();

  const plan = planDeudas(vigentes, aDeudas, estrategia);
  const soloMinimos = planDeudas(vigentes, 0, estrategia);
  const otra = planDeudas(vigentes, aDeudas, estrategia === 'avalancha' ? 'bola-de-nieve' : 'avalancha');
  const ahorroPorExtra = aDeudas > cuotas && !soloMinimos.imposible && !plan.imposible ? soloMinimos.interesTotal - plan.interesTotal : 0;

  return `
    <section class="tarjeta hero">
      <p class="hero-etiqueta">Debes en total</p>
      <p class="hero-numero">${clp(totalVigente + totalPausa)}</p>
      <p class="hero-detalle">${totalVigente + totalPausa === 0 ? (datos.deudas.length ? 'Hoy no debes nada' : 'No tienes deudas anotadas')
        : `${clp(totalVigente)} pagándose${totalPausa ? ` · ${clp(totalPausa)} en pausa` : ''}`}</p>
    </section>

    ${tarjetasHTML()}

    ${vigentes.length ? `
    <section class="tarjeta">
      <h2>Tu plan para salir</h2>
      <form id="form-presupuesto" class="fila-form">
        <label class="campo"><span>Total al mes para deudas ($)</span>
          ${inputMonto({ nombre: 'total', valor: aDeudas || '', placeholder: cuotas ? numero(cuotas) : '' })}
        </label>
        <button class="boton secundario">Recalcular</button>
      </form>
      <p class="ayuda">Las cuotas mínimas suman ${clp(cuotas)}${aDeudas > cuotas ? `; los otros ${clp(aDeudas - cuotas)} van como abono extra` : ''}. Cuando una deuda se termina, su cuota pasa a la siguiente.</p>

      <div class="chips" role="group" aria-label="Estrategia">
        <button class="chip" data-estrategia="avalancha" aria-pressed="${estrategia === 'avalancha'}">Avalancha</button>
        <button class="chip" data-estrategia="bola-de-nieve" aria-pressed="${estrategia === 'bola-de-nieve'}">Bola de nieve</button>
      </div>
      <p class="ayuda">${estrategia === 'avalancha'
        ? 'El abono extra va a la de <b>CAE más alto</b>. Es la que te cobra menos intereses en total.'
        : 'El abono extra va a la de <b>menor saldo</b>. Cierras deudas antes, lo que motiva, pero pagas más intereses.'}
        Las deudas con fecha límite se pagan completas, a más tardar, ese mes.</p>

      ${plan.imposible
        ? `<p class="mensaje critico">✕ Con este total, alguna deuda nunca se termina de pagar: los intereses le ganan a la cuota. Sube el total al mes o revisa el CAE.</p>`
        : `<p class="plan-resultado">Terminas con las deudas activas en <b>${duracion(plan.meses)}</b>
            <small>(${esc(nombreMes(plan.deudas.at(-1).mesTermino))}) · pagarías ~${clp(plan.interesTotal)} en intereses</small></p>`}
      ${plan.fueraDePlazo.map(d => `<p class="mensaje critico">✕ ${esc(d.nombre)} no alcanza a quedar pagada a más tardar en ${esc(nombreMes(d.fechaLimite))}. Sube el total al mes o conversa el plazo.</p>`).join('')}

      <ol class="plan-orden">
        ${plan.deudas.map(d => `<li><span>${esc(d.nombre)}</span><small>${d.mesTermino ? 'Terminas en ' + esc(nombreMes(d.mesTermino)) : 'No se termina'}${d.fechaLimite && !d.fueraDePlazo ? ' · ✓ a tiempo' : ''}</small></li>`).join('')}
      </ol>
      ${ahorroPorExtra > 0 ? `<p class="mensaje ok">✓ Comparado con pagar solo los mínimos, te ahorras ~${clp(ahorroPorExtra)} en intereses${soloMinimos.meses > plan.meses ? ` y terminas ${duracion(soloMinimos.meses - plan.meses)} antes` : ''}.</p>` : ''}
      ${!plan.imposible && !otra.imposible && otra.interesTotal < plan.interesTotal - 1000
        ? `<p class="ayuda">La otra estrategia te ahorraría ~${clp(plan.interesTotal - otra.interesTotal)} en intereses.</p>` : ''}
      ${pausadas.length ? `<p class="ayuda">Las deudas en pausa (${clp(totalPausa)}) no están en este cálculo. Cuando las reactives, entran al plan.</p>` : ''}
      <p class="ayuda nota">Es una estimación: usa el CAE como tasa y supone que no agregas compras nuevas a estas deudas. El mes en que cierres una tarjeta, paga el saldo que diga la cartola.</p>
    </section>` : ''}

    <section class="tarjeta">
      <div class="titulo-con-accion"><h2>Pagándose</h2><button class="boton pequeño" id="nueva-deuda">+ Agregar</button></div>
      ${vigentes.length ? `<ul class="lista">${vigentes.map(filaDeuda).join('')}</ul>`
      : '<div class="vacio">Agrega tus deudas: tarjetas, créditos, línea de crédito, avances, cuotas de casas comerciales, préstamos de familia.<br>El saldo y el CAE salen en el estado de cuenta.</div>'}
    </section>

    ${pausadas.length ? `
    <section class="tarjeta">
      <h2>En pausa</h2>
      <p class="ayuda">Acordadas para más adelante. No descuentan cuota hasta que las reactives.</p>
      <ul class="lista">${pausadas.map(filaDeuda).join('')}</ul>
    </section>` : ''}

    ${pagadas.length ? `
    <section class="tarjeta">
      <h2>Pagadas 🎉</h2>
      <ul class="lista">${pagadas.map(filaDeuda).join('')}</ul>
    </section>` : ''}
  `;
}

// conTarjeta: al anotar la deuda desde una tarjeta, ya viene elegida.
async function editarDeuda(d, refrescar, conTarjeta = null) {
  const nueva = !d;
  d = d || { estado: 'activa', tarjeta: conTarjeta, nombre: conTarjeta ? nombreTarjeta(conTarjeta, { conDigitos: false }) : undefined };
  const mias = misTarjetas();
  // Una tarjeta ya unida a otra deuda no se ofrece (cada tarjeta, una deuda).
  const libres = mias.filter(id => id === d.tarjeta || !datos.deudas.some(x => x.tarjeta === id && x.id !== d.id));
  const mes = mesActual();
  const meses = Array.from({ length: 36 }, (_, i) => sumarMeses(mes, i));
  if (d.fecha_limite && !meses.includes(d.fecha_limite)) meses.unshift(d.fecha_limite);

  const v = await abrirFormulario({
    titulo: nueva ? 'Nueva deuda' : d.nombre,
    puedeBorrar: !nueva,
    campos: [
      { nombre: 'nombre', etiqueta: 'Nombre', valor: d.nombre, requerido: true, placeholder: 'ej: Tarjeta CMR, Préstamo papá' },
      ...(libres.length ? [{ nombre: 'tarjeta', etiqueta: '¿Es de una de tus tarjetas?', tipo: 'select', valor: d.tarjeta || '',
        opciones: [['', 'No es de una tarjeta'], ...libres.map(id => [id, nombreTarjeta(id)])],
        ayuda: 'Así la ves en Tus tarjetas con su disponible.' }] : []),
      { nombre: 'saldo', etiqueta: 'Saldo que debes hoy ($)', tipo: 'monto', valor: d.saldo, requerido: true, ayuda: 'En tarjetas: el "monto total adeudado" o "deuda total" del estado de cuenta.' },
      { nombre: 'cuota_mensual', etiqueta: 'Cuota o pago mínimo mensual ($)', tipo: 'monto', valor: d.cuota_mensual, ayuda: 'Déjalo en 0 si no tiene cuota fija (por ejemplo, un préstamo que pagas cuando puedas).' },
      { nombre: 'cae', etiqueta: 'CAE (% anual)', tipo: 'number', valor: d.cae, placeholder: 'ej: 38,5', ayuda: 'Sale en el estado de cuenta. Las casas comerciales suelen estar sobre 40%. Préstamos de familia: 0.' },
      { nombre: 'cupo_total', etiqueta: 'Cupo total, si es tarjeta ($)', tipo: 'monto', valor: d.cupo_total, ayuda: 'Para avisarte cuando uses más del 85%.' },
      { nombre: 'dia_pago', etiqueta: 'Día de pago', tipo: 'number', valor: d.dia_pago, placeholder: '1 a 31' },
      { nombre: 'fecha_limite', etiqueta: '¿Tiene que estar pagada antes de una fecha?', tipo: 'select', valor: d.fecha_limite || '', opciones: [['', 'No'], ...meses.map(m => [m, nombreMes(m)])] },
      { nombre: 'estado', etiqueta: 'Estado', tipo: 'select', valor: d.estado || 'activa', opciones: [['activa', 'Pagándose'], ['pausa', 'En pausa (acordado)']] },
      { nombre: 'notas', etiqueta: 'Acuerdo o notas', tipo: 'textarea', valor: d.notas, placeholder: 'ej: pausa hasta terminar las tarjetas' },
    ],
  });
  if (!v) return;
  if (v === 'borrar') return ejecutar(() => borrar('deudas', d.id), 'Deuda borrada', refrescar);
  const fila = {
    ...d, ...v,
    saldo: Math.round(v.saldo || 0),
    cuota_mensual: Math.round(v.cuota_mensual || 0),
    cae: v.cae || 0,
    cupo_total: v.cupo_total ? Math.round(v.cupo_total) : null,
    dia_pago: v.dia_pago ? Math.min(31, Math.max(1, Math.round(v.dia_pago))) : null,
    // Sin tarjetas para elegir no hay pregunta: la deuda queda como estaba.
    tarjeta: v.tarjeta === undefined ? (d.tarjeta ?? null) : libres.includes(v.tarjeta) ? v.tarjeta : null,
  };
  const terminada = d.saldo > 0 && fila.saldo === 0;
  ejecutar(() => guardar('deudas', fila), terminada ? `Terminaste de pagar ${fila.nombre}.` : 'Deuda guardada', refrescar, terminada ? 'logro' : 'ok');
}

export function montar(raiz, refrescar) {
  activarTarjetas3D(raiz);
  montarElegir(raiz, { refrescar, avisarError: m => avisar(m, 'error') });
  raiz.querySelector('#agregar-tarjeta')?.addEventListener('click', () => { empezarAElegir(); refrescar(); });
  raiz.querySelectorAll('[data-tarjeta]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.tarjeta;
    editarDeuda(deudaDe(id), refrescar, id);
  }));
  raiz.querySelectorAll('[data-calzar]').forEach(b => b.addEventListener('click', () => {
    const d = datos.deudas.find(x => x.id === b.dataset.calzar);
    if (d) ejecutar(() => guardar('deudas', { ...d, tarjeta: b.dataset.con }), 'Listo: quedó unida a tu tarjeta.', refrescar);
  }));
  raiz.querySelectorAll('[data-descartar]').forEach(b => b.addEventListener('click', () => { descartados.add(b.dataset.descartar); refrescar(); }));
  raiz.querySelector('#nueva-deuda').addEventListener('click', () => editarDeuda(null, refrescar));
  raiz.querySelectorAll('[data-deuda]').forEach(b => b.addEventListener('click', () => editarDeuda(datos.deudas.find(d => d.id === b.dataset.deuda), refrescar)));
  raiz.querySelectorAll('[data-estrategia]').forEach(b => b.addEventListener('click', () => {
    estrategia = b.dataset.estrategia;
    refrescar();
  }));
  raiz.querySelector('#form-presupuesto')?.addEventListener('submit', e => {
    e.preventDefault();
    const total = Math.max(0, leerMonto(e.target.total.value));
    ejecutar(() => guardarPerfil({ presupuesto_deudas: total }), 'Plan recalculado', refrescar);
  });
}
