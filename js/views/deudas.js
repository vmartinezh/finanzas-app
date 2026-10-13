import { datos, guardar, borrar, guardarPerfil } from '../db.js';
import { planDeudas, deudasVigentes, deudasEnPausa, destinoDeudas, usoCupo } from '../calculos.js';
import { abrirFormulario, ejecutar, barraProgreso } from '../ui.js';
import { clp, esc, nombreMes, porcentaje, mesActual, sumarMeses } from '../util.js';

export const titulo = 'Tu plan';

let estrategia = 'avalancha';

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
      <p class="hero-detalle">${clp(totalVigente)} pagándose${totalPausa ? ` · ${clp(totalPausa)} en pausa` : ''}</p>
    </section>

    ${vigentes.length ? `
    <section class="tarjeta">
      <h2>Tu plan para salir</h2>
      <form id="form-presupuesto" class="fila-form">
        <label class="campo"><span>Total al mes para deudas ($)</span>
          <input name="total" type="number" inputmode="numeric" min="0" step="1000" value="${aDeudas || ''}" placeholder="${cuotas}">
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

async function editarDeuda(d, refrescar) {
  const nueva = !d;
  d = d || { estado: 'activa' };
  const mes = mesActual();
  const meses = Array.from({ length: 36 }, (_, i) => sumarMeses(mes, i));
  if (d.fecha_limite && !meses.includes(d.fecha_limite)) meses.unshift(d.fecha_limite);

  const v = await abrirFormulario({
    titulo: nueva ? 'Nueva deuda' : d.nombre,
    puedeBorrar: !nueva,
    campos: [
      { nombre: 'nombre', etiqueta: 'Nombre', valor: d.nombre, requerido: true, placeholder: 'ej: Tarjeta CMR, Préstamo papá' },
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
  };
  ejecutar(() => guardar('deudas', fila), 'Deuda guardada', refrescar);
}

export function montar(raiz, refrescar) {
  raiz.querySelector('#nueva-deuda').addEventListener('click', () => editarDeuda(null, refrescar));
  raiz.querySelectorAll('[data-deuda]').forEach(b => b.addEventListener('click', () => editarDeuda(datos.deudas.find(d => d.id === b.dataset.deuda), refrescar)));
  raiz.querySelectorAll('[data-estrategia]').forEach(b => b.addEventListener('click', () => {
    estrategia = b.dataset.estrategia;
    refrescar();
  }));
  raiz.querySelector('#form-presupuesto')?.addEventListener('submit', e => {
    e.preventDefault();
    const total = Math.max(0, Math.round(Number(e.target.total.value) || 0));
    ejecutar(() => guardarPerfil({ presupuesto_deudas: total }), 'Plan recalculado', refrescar);
  });
}
