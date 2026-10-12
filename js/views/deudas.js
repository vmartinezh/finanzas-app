import { datos, guardar, borrar, guardarPerfil } from '../db.js';
import { planDeudas } from '../calculos.js';
import { abrirFormulario, ejecutar } from '../ui.js';
import { clp, esc, nombreMes, numero } from '../util.js';

export const titulo = 'Deudas';

let estrategia = 'avalancha';

const duracion = meses => {
  if (meses == null) return 'nunca, con estas cuotas';
  const a = Math.floor(meses / 12);
  const m = meses % 12;
  return [a ? `${a} ${a === 1 ? 'año' : 'años'}` : '', m ? `${m} ${m === 1 ? 'mes' : 'meses'}` : ''].filter(Boolean).join(' y ') || 'este mes';
};

export function render() {
  const deudas = datos.deudas.slice().sort((a, b) => (b.cae || 0) - (a.cae || 0));
  const vigentes = deudas.filter(d => d.saldo > 0);
  const total = vigentes.reduce((s, d) => s + d.saldo, 0);
  const cuotas = vigentes.reduce((s, d) => s + (d.cuota_mensual || 0), 0);
  const extra = datos.perfil.pago_extra_deudas || 0;

  const plan = planDeudas(vigentes, extra, estrategia);
  const sinExtra = planDeudas(vigentes, 0, estrategia);
  const otra = planDeudas(vigentes, extra, estrategia === 'avalancha' ? 'bola-de-nieve' : 'avalancha');
  const ahorroPorExtra = extra && !sinExtra.imposible && !plan.imposible ? sinExtra.interesTotal - plan.interesTotal : 0;

  return `
    <section class="tarjeta hero">
      <p class="hero-etiqueta">Debes en total</p>
      <p class="hero-numero">${clp(total)}</p>
      <p class="hero-detalle">${vigentes.length} ${vigentes.length === 1 ? 'deuda' : 'deudas'} · pagas ${clp(cuotas)} al mes en cuotas</p>
    </section>

    ${vigentes.length ? `
    <section class="tarjeta">
      <h2>Tu plan para salir</h2>
      <div class="chips" role="group" aria-label="Estrategia">
        <button class="chip" data-estrategia="avalancha" aria-pressed="${estrategia === 'avalancha'}">Avalancha</button>
        <button class="chip" data-estrategia="bola-de-nieve" aria-pressed="${estrategia === 'bola-de-nieve'}">Bola de nieve</button>
      </div>
      <p class="ayuda">${estrategia === 'avalancha'
        ? 'Pagas la cuota mínima de todas y lo extra va a la de <b>CAE más alto</b>. Es la que te cobra menos intereses en total.'
        : 'Pagas la cuota mínima de todas y lo extra va a la de <b>menor saldo</b>. Cierras deudas antes, lo que motiva, pero pagas más intereses.'}</p>

      ${plan.imposible
        ? `<p class="mensaje critico">✕ Con estas cuotas, alguna deuda nunca se termina de pagar: los intereses son más que la cuota. Revisa el CAE y la cuota, o súmale un abono extra.</p>`
        : `<p class="plan-resultado">Quedas libre de deudas en <b>${duracion(plan.meses)}</b>
            <small>(${esc(nombreMes(plan.deudas.at(-1).mesTermino))}) · pagarías ~${clp(plan.interesTotal)} en intereses</small></p>`}

      <ol class="plan-orden">
        ${plan.deudas.map(d => `<li><span>${esc(d.nombre)}</span><small>${d.mesTermino ? 'Terminas en ' + esc(nombreMes(d.mesTermino)) : 'No se termina'}</small></li>`).join('')}
      </ol>

      <form id="form-extra" class="fila-form">
        <label class="campo"><span>Abono extra al mes ($)</span>
          <input name="extra" type="number" inputmode="numeric" min="0" step="1000" value="${extra || ''}" placeholder="0">
        </label>
        <button class="boton secundario">Recalcular</button>
      </form>
      ${ahorroPorExtra > 0 ? `<p class="mensaje ok">✓ Con ese abono extra te ahorras ~${clp(ahorroPorExtra)} en intereses${sinExtra.meses > plan.meses ? ` y terminas ${duracion(sinExtra.meses - plan.meses)} antes` : ''}.</p>` : ''}
      ${!plan.imposible && !otra.imposible && otra.interesTotal < plan.interesTotal - 1000
        ? `<p class="ayuda">La otra estrategia te ahorraría ~${clp(plan.interesTotal - otra.interesTotal)} en intereses.</p>` : ''}
      <p class="ayuda nota">Es una estimación: usa el CAE como tasa y supone que no agregas compras nuevas a estas deudas.</p>
    </section>` : ''}

    <section class="tarjeta">
      <div class="titulo-con-accion"><h2>Mis deudas</h2><button class="boton pequeño" id="nueva-deuda">+ Agregar</button></div>
      ${deudas.length ? `<ul class="lista">${deudas.map(d => `
        <li><button class="fila" data-deuda="${d.id}">
          <span class="fila-texto"><b>${esc(d.nombre)}</b>
            <small>${d.saldo > 0 ? `Cuota ${clp(d.cuota_mensual)}${d.cae ? ` · CAE ${numero(d.cae)}%` : ''}${d.dia_pago ? ` · día ${d.dia_pago}` : ''}` : '<span class="etiqueta pagada">✓ Pagada</span>'}</small>
          </span>
          <span class="monto">${clp(d.saldo)}</span>
        </button></li>`).join('')}</ul>`
      : '<div class="vacio">Agrega tus deudas: tarjetas, créditos de consumo, línea de crédito, avances, cuotas de casas comerciales.<br>El saldo y el CAE salen en el estado de cuenta.</div>'}
    </section>
  `;
}

async function editarDeuda(d, refrescar) {
  const nueva = !d;
  d = d || {};
  const v = await abrirFormulario({
    titulo: nueva ? 'Nueva deuda' : d.nombre,
    puedeBorrar: !nueva,
    campos: [
      { nombre: 'nombre', etiqueta: 'Nombre', valor: d.nombre, requerido: true, placeholder: 'ej: Tarjeta CMR' },
      { nombre: 'saldo', etiqueta: 'Saldo que debes hoy ($)', tipo: 'monto', valor: d.saldo, requerido: true, ayuda: 'El "monto total adeudado" o "deuda total" del estado de cuenta.' },
      { nombre: 'cuota_mensual', etiqueta: 'Cuota o pago mínimo mensual ($)', tipo: 'monto', valor: d.cuota_mensual, requerido: true },
      { nombre: 'cae', etiqueta: 'CAE (% anual)', tipo: 'number', valor: d.cae, placeholder: 'ej: 38,5', ayuda: 'Sale en el estado de cuenta o en el contrato. Las casas comerciales suelen estar sobre 40%.' },
      { nombre: 'dia_pago', etiqueta: 'Día de pago', tipo: 'number', valor: d.dia_pago, placeholder: '1 a 31' },
    ],
  });
  if (!v) return;
  if (v === 'borrar') return ejecutar(() => borrar('deudas', d.id), 'Deuda borrada', refrescar);
  const fila = {
    ...d, ...v,
    saldo: Math.round(v.saldo || 0),
    cuota_mensual: Math.round(v.cuota_mensual || 0),
    cae: v.cae || 0,
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
  raiz.querySelector('#form-extra')?.addEventListener('submit', e => {
    e.preventDefault();
    const extra = Math.max(0, Math.round(Number(e.target.extra.value) || 0));
    ejecutar(() => guardarPerfil({ pago_extra_deudas: extra }), 'Plan recalculado', refrescar);
  });
}
