import { datos, guardar, borrar, nuevoId, modo } from '../db.js';
import { resumenMeDeben, estadoCobro, cuotasDeCobro, pagosDeCobro, dividirGasto } from '../calculos.js';
import { abrirFormulario, ejecutar, avisar, confirmar } from '../ui.js';
import { clp, esc, hoyISO, mesActual, fechaCorta, normalizar, limpiarNombre } from '../util.js';
import { estadoAvisos, activarAvisos, desactivarAvisos } from '../avisos.js';

export const titulo = 'Me deben';

// Personas desplegadas en la lista: se mantienen abiertas al volver a dibujar.
const abiertas = new Set();

// "Zapatillas · cuota 2 de 3 atrasada", "Asado · vence hoy", "Préstamo · 30 oct".
function resumenCobro(c, e) {
  const cuota = e.cuotas > 1 && e.proxima ? `cuota ${e.proxima.numero} de ${e.cuotas}` : '';
  const cuando = e.situacion === 'atrasado' ? (cuota ? `${cuota} atrasada` : 'atrasado')
    : e.situacion === 'hoy' ? (cuota ? `${cuota} vence hoy` : 'vence hoy')
    : e.proxima?.vence ? [cuota, fechaCorta(e.proxima.vence)].filter(Boolean).join(' · ')
    : cuota || 'sin fecha';
  return `${esc(c.concepto)} · ${esc(cuando)}`;
}

const ETIQUETA = {
  atrasado: '<span class="etiqueta atrasado">Atrasado</span>',
  hoy: '<span class="etiqueta pendiente">Vence hoy</span>',
};

function bloqueCobro({ c, e }) {
  const cuota = cuotasDeCobro(c)[(e.proxima?.numero ?? 1) - 1];
  const aMedias = e.proxima && cuota && e.proxima.monto < cuota.monto;
  const detalle = [
    e.cuotas > 1 && e.proxima ? `Cuota ${e.proxima.numero} de ${e.cuotas}: ${clp(e.proxima.monto)}${aMedias ? ' (lo que falta)' : ''}` : '',
    e.proxima?.vence ? `${e.situacion === 'atrasado' ? 'venció el' : 'vence el'} ${fechaCorta(e.proxima.vence)}` : 'sin fecha',
  ].filter(Boolean);
  // La fecha va junto a su etiqueta y sin cortes, para que "venció el 9 oct · Atrasado" no quede partido.
  const fecha = detalle.pop();
  const partes = [...detalle.map(esc), `<span class="sin-corte">${esc(fecha)}${ETIQUETA[e.situacion] ? ` ${ETIQUETA[e.situacion]}` : ''}</span>`];
  return `<li class="cobro">
    <div class="fila-linea">
      <span class="fila-texto"><b>${esc(c.concepto)}</b><small>${partes.join(' · ')}</small></span>
      <span class="monto">${clp(e.pendiente)}</span>
    </div>
    ${e.pagado ? `<small class="ayuda">Ya te pagó ${clp(e.pagado)} de ${clp(c.monto_total)}</small>` : ''}
    <div class="botones">
      <button class="boton pequeño" data-pagar-cobro="${c.id}">Me pagó</button>
      <button class="boton pequeño secundario" data-editar-cobro="${c.id}">Editar</button>
    </div>
  </li>`;
}

function filaPersona(g) {
  const urgente = g.e.situacion === 'atrasado';
  const otros = g.cobros.length - 1;
  return `<li>
    <details class="persona-cobro" data-persona="${g.persona.id}" ${abiertas.has(g.persona.id) ? 'open' : ''}>
      <summary class="fila">
        <span class="fila-texto">
          <b>${esc(g.persona.nombre)}</b>
          <small>${resumenCobro(g.cobros[0].c, g.e)}${otros ? ` · y ${otros} más` : ''}</small>
        </span>
        <span class="monto${urgente ? ' atrasado' : ''}">${clp(g.pendiente)}</span>
        <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
      </summary>
      <ul class="cobros-persona">${g.cobros.map(bloqueCobro).join('')}</ul>
      <button class="boton-texto" data-renombrar="${g.persona.id}">Cambiar el nombre de ${esc(g.persona.nombre)}</button>
    </details>
  </li>`;
}

function filaSaldado({ c, e, persona }) {
  return `<li><button class="fila" data-editar-cobro="${c.id}">
    <span class="fila-texto"><b>${esc(persona.nombre)}</b><small>${esc(c.concepto)} · ${e.situacion === 'perdonado'
      ? '<span class="etiqueta">Lo diste por perdido</span>'
      : '<span class="etiqueta pagada">✓ Pagado</span>'}</small></span>
    <span class="monto">${clp(c.monto_total)}</span>
  </button></li>`;
}

export function render() {
  const r = resumenMeDeben();
  const avisos = [
    r.atrasados ? `${r.atrasados} ${r.atrasados === 1 ? 'atrasado' : 'atrasados'}` : '',
    r.hoy ? `${r.hoy} ${r.hoy === 1 ? 'vence' : 'vencen'} hoy` : '',
  ].filter(Boolean);
  const vacio = !r.personas.length && !r.saldados.length;

  return `
    <section class="tarjeta hero">
      <p class="hero-etiqueta">Te deben en total</p>
      <p class="hero-numero">${clp(r.total)}</p>
      <p class="hero-detalle">${r.personas.length
        ? (avisos.length ? avisos.join(' · ') : 'Nada atrasado')
        : 'Nadie te debe nada por ahora'}</p>
      <div class="botones">
        <button class="boton primario" id="nuevo-cobro">+ Me deben</button>
        <button class="boton secundario" id="dividir">Dividir un gasto</button>
      </div>
    </section>

    <section class="tarjeta" id="avisos" hidden></section>

    <section class="tarjeta">
      ${vacio
        ? `<div class="vacio">Anota lo que prestas o pagas por otros, como el asado o unas zapatillas en cuotas.<br>Te aviso cuándo toca cobrar.</div>`
        : r.personas.length
          ? `<ul class="lista">${r.personas.map(filaPersona).join('')}</ul>`
          : '<div class="vacio">Te pagaron todo. Cuando prestes algo de nuevo, anótalo aquí.</div>'}
    </section>

    ${r.saldados.length ? `
    <details class="tarjeta plegable">
      <summary><h2>Ya te pagaron <span class="contador">${r.saldados.length}</span></h2><svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg></summary>
      <ul class="lista">${r.saldados.map(filaSaldado).join('')}</ul>
    </details>` : ''}
  `;
}

// ---- Avisos al celular ----

const TEXTO_AVISOS = {
  inactivos: ['¿Te aviso el día que toca cobrar?', 'Te llega en la mañana y solo dice "Hoy te toca cobrar algo 👀", sin nombres ni montos.', '<button class="boton pequeño" data-avisos="activar">Activar</button>'],
  activos: ['Te aviso en este celular', 'El día que toca cobrar, en la mañana.', '<button class="boton pequeño secundario" data-avisos="desactivar">Desactivar</button>'],
  bloqueados: ['Los avisos están bloqueados', 'Para recibirlos, permite las notificaciones de Simplifica en los ajustes del navegador o del celular.', ''],
  instalar: ['¿Quieres avisos en tu iPhone?', 'Primero agrega Simplifica a tu pantalla de inicio: toca Compartir y luego "Agregar a inicio".', ''],
};

async function pintarAvisos(raiz) {
  const caja = raiz.querySelector('#avisos');
  const estado = await estadoAvisos().catch(() => 'no');
  if (!caja?.isConnected || !TEXTO_AVISOS[estado]) return;
  const [titulo, detalle, boton] = TEXTO_AVISOS[estado];
  caja.innerHTML = `<div class="fila-linea">
    <span class="fila-texto"><b>${titulo}</b><small>${detalle}</small></span>
    ${boton}
  </div>`;
  caja.hidden = false;
  caja.querySelector('[data-avisos]')?.addEventListener('click', async e => {
    const boton = e.currentTarget;
    boton.disabled = true;
    try {
      if (boton.dataset.avisos === 'activar') {
        avisar(await activarAvisos() ? 'Listo: te aviso el día que toque cobrar.' : 'Sin permiso no te puedo avisar. Puedes activarlo cuando quieras.');
      } else {
        await desactivarAvisos();
        avisar('Avisos desactivados en este celular.');
      }
    } catch (error) {
      console.error(error);
      avisar('No se pudieron cambiar los avisos. Revisa tu conexión e intenta de nuevo.', 'error');
    }
    pintarAvisos(raiz);
  });
}

// ---- Formularios ----

const nombresConocidos = () => datos.personas.map(p => p.nombre).sort((a, b) => a.localeCompare(b, 'es'));

// La persona con ese nombre (sin importar mayúsculas ni tildes), o una nueva sin guardar.
function personaPorNombre(nombre) {
  const limpio = limpiarNombre(nombre);
  return datos.personas.find(p => normalizar(p.nombre) === normalizar(limpio)) ?? { id: nuevoId(), nombre: limpio, nueva: true };
}

async function guardarPersona(p) {
  if (!p.nueva) return p;
  const { nueva, ...fila } = p;
  return guardar('personas', fila);
}

// Una persona sin cuentas no aparece en ningún lado: se borra para no acumularlas.
async function limpiarPersona(personaId) {
  if (personaId && !datos.cobros.some(c => c.persona_id === personaId)) await borrar('personas', personaId);
}

function textoCuotas(v) {
  if (!v.monto_total || v.monto_total <= 0) return '';
  const n = Math.min(120, Math.max(1, Math.round(v.cuotas || 1)));
  const cuotas = cuotasDeCobro({ monto_total: Math.round(v.monto_total), cuotas: n, primer_vencimiento: v.primer_vencimiento });
  const fechas = cuotas.map(c => c.vence).filter(Boolean).map(fechaCorta);
  if (n === 1) return `Te debe ${clp(cuotas[0].monto)}${fechas.length ? `, para el ${fechas[0]}` : ''}.`;
  const iguales = cuotas.every(c => c.monto === cuotas[0].monto);
  const montos = iguales ? `${n} cuotas de ${clp(cuotas[0].monto)}` : `${n} cuotas de ${clp(cuotas.at(-1).monto)} a ${clp(cuotas[0].monto)}`;
  return `${montos}${fechas.length ? `: ${fechas.slice(0, 3).join(', ')}${n > 3 ? '…' : ''}` : ''}.`;
}

async function anotarCobro(c, refrescar) {
  const nuevo = !c;
  c = c || { cuotas: 1, estado: 'pendiente' };
  const persona = datos.personas.find(p => p.id === c.persona_id);
  const yaPagado = nuevo ? 0 : estadoCobro(c).pagado;
  const v = await abrirFormulario({
    titulo: nuevo ? 'Me deben' : c.concepto,
    puedeBorrar: !nuevo,
    textoGuardar: nuevo ? 'Anotar' : 'Guardar',
    campos: [
      { nombre: 'persona', etiqueta: '¿Quién te debe?', valor: persona?.nombre, requerido: true, placeholder: 'ej: Matías', sugerencias: nombresConocidos() },
      { nombre: 'concepto', etiqueta: '¿Por qué?', valor: c.concepto, requerido: true, placeholder: 'ej: zapatillas, préstamo, asado' },
      // Al anotar se parte de lo que falta; al editar, el total original, porque los pagos ya registrados se descuentan solos.
      nuevo
        ? { nombre: 'monto_total', etiqueta: 'Cuánto te falta recibir ($)', tipo: 'monto', requerido: true, ayuda: 'Si te paga en cuotas, pon el total que falta: 2 cuotas de $40.000 son $80.000.' }
        : { nombre: 'monto_total', etiqueta: 'Total que te debía ($)', tipo: 'monto', valor: c.monto_total, requerido: true, ayuda: yaPagado ? `Lo que ya te pagó (${clp(yaPagado)}) se descuenta solo.` : '' },
      { nombre: 'cuotas', etiqueta: '¿En cuántas cuotas?', tipo: 'number', valor: c.cuotas, min: 1, max: 120 },
      nuevo
        ? { nombre: 'primer_vencimiento', etiqueta: '¿Cuándo te paga?', tipo: 'date', ayuda: 'Si son cuotas, la fecha de la primera que falta. Las demás, el mismo día de cada mes.' }
        : { nombre: 'primer_vencimiento', etiqueta: 'Fecha de la primera cuota', tipo: 'date', valor: c.primer_vencimiento, ayuda: 'Las demás vencen el mismo día de cada mes.' },
      // Si prestó por transferencia o pagó en efectivo, ese gasto no está en sus movimientos:
      // sin anotarlo, lo que le devuelvan inflaría "puedes gastar hoy".
      ...(nuevo ? [{ nombre: 'anotar_gasto', etiqueta: 'También anotarlo como gasto de hoy', tipo: 'checkbox',
        ayuda: 'Márcalo si la plata salió de tu bolsillo y no está en tus movimientos. Así, cuando te pague, tus cuentas cuadran.' }] : []),
      ...(nuevo ? [] : [{ nombre: 'estado', etiqueta: 'Estado', tipo: 'select', valor: c.estado, opciones: [['pendiente', 'Me lo tiene que pagar'], ['perdonado', 'Lo doy por perdido']] }]),
    ],
    vistaPrevia: textoCuotas,
  });
  if (!v) return;
  if (v === 'borrar') return borrarCobro(c, refrescar);
  const monto = Math.round(v.monto_total || 0);
  if (monto <= 0) return avisar('Escribe cuánto te deben.', 'error');

  const p = personaPorNombre(v.persona);
  const anterior = c.persona_id;
  ejecutar(async () => {
    await guardarPersona(p);
    const fila = await guardar('cobros', {
      ...c,
      persona_id: p.id,
      concepto: String(v.concepto).trim().slice(0, 80),
      monto_total: monto,
      cuotas: Math.min(120, Math.max(1, Math.round(v.cuotas || 1))),
      primer_vencimiento: v.primer_vencimiento || null,
      estado: v.estado || c.estado || 'pendiente',
    });
    if (v.anotar_gasto) await anotarGasto(monto, `${String(v.concepto).trim()} · ${p.nombre}`, fila.id);
    if (anterior !== p.id) await limpiarPersona(anterior);
  }, nuevo ? `Anotado: ${p.nombre} te debe ${clp(monto)}${v.anotar_gasto ? ', y el gasto de hoy' : ''}` : 'Guardado', refrescar);
}

// La plata que salió para prestar o pagar por otros, como gasto de hoy en "Otros".
// Va enlazada al cobro (si hay uno) para saber de dónde salió.
function anotarGasto(monto, descripcion, cobroId = null) {
  const otros = datos.categorias.find(x => x.tipo === 'gasto' && normalizar(x.nombre) === 'otros');
  return guardar('movimientos', {
    fecha: hoyISO(), monto, tipo: 'gasto', descripcion: descripcion.slice(0, 200),
    comercio: null, categoria_id: otros?.id ?? null, evento_id: null, compromiso_id: null, deuda_id: null,
    cobro_id: cobroId, origen: 'manual', estado: 'clasificado',
  });
}

async function borrarCobro(c, refrescar) {
  const pagos = pagosDeCobro(c);
  const pregunta = pagos.length
    ? `Los pagos que ya registraste (${clp(pagos.reduce((s, m) => s + m.monto, 0))}) se quedan en tus movimientos. ¿Borrar "${c.concepto}"?`
    : `¿Borrar "${c.concepto}"?`;
  if (!(await confirmar(pregunta))) return;
  ejecutar(async () => {
    await borrar('cobros', c.id);
    // Los pagos (y el gasto, si se anotó) quedan como movimientos sueltos. En la nube la base suelta el enlace
    // sola (clave foránea), así que basta con hacerlo en memoria; en modo local
    // no hay base que lo haga y se guarda.
    for (const m of datos.movimientos.filter(m => m.cobro_id === c.id)) {
      if (modo === 'local') await guardar('movimientos', { ...m, cobro_id: null });
      else m.cobro_id = null;
    }
    await limpiarPersona(c.persona_id);
  }, 'Borrado', refrescar);
}

// También se usa desde Inicio ("Hoy te pagan").
export async function registrarPago(c, refrescar) {
  const persona = datos.personas.find(p => p.id === c.persona_id);
  const e = estadoCobro(c);
  const quien = persona?.nombre ?? 'Alguien';
  // Si se atrasó en más de una cuota, se propone todo lo vencido.
  const variasAtrasadas = e.vencido > (e.proxima?.monto ?? 0);
  const v = await abrirFormulario({
    titulo: `${quien} te pagó`,
    textoGuardar: 'Registrar pago',
    intro: `${e.cuotas > 1 && e.proxima ? `Cuota ${e.proxima.numero} de ${e.cuotas} de ` : ''}<b>${esc(c.concepto)}</b>. ${variasAtrasadas ? `Tiene ${clp(e.vencido)} atrasados y te` : 'Te'} falta recibir ${clp(e.pendiente)} en total.`,
    campos: [
      { nombre: 'monto', etiqueta: '¿Cuánto te pagó? ($)', tipo: 'monto', valor: variasAtrasadas ? e.vencido : e.proxima?.monto ?? e.pendiente, requerido: true },
      { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'date', valor: hoyISO(), requerido: true },
    ],
  });
  if (!v) return;
  const monto = Math.round(v.monto || 0);
  if (monto <= 0) return avisar('Escribe cuánto te pagó.', 'error');
  if (monto > e.pendiente && !(await confirmar(`Es más de lo que te falta recibir (${clp(e.pendiente)}). ¿Registrarlo igual?`))) return;

  ejecutar(async () => {
    await guardar('movimientos', {
      fecha: v.fecha, monto, tipo: 'ingreso',
      descripcion: `Pago de ${quien} · ${c.concepto}`.slice(0, 200),
      comercio: null, categoria_id: null, evento_id: null, compromiso_id: null, deuda_id: null,
      cobro_id: c.id, origen: 'manual', estado: 'clasificado',
    });
    const despues = estadoCobro(c);
    avisar(despues.saldado
      ? `Listo: ${quien} ya te pagó todo "${c.concepto}".`
      : `Listo, ${quien} te pagó ${clp(monto)}.${v.fecha.startsWith(mesActual()) ? ' Ya suma a lo que puedes gastar.' : ''}`);
  }, null, refrescar);
}

// Divide los nombres escritos ("Cata, Diego\nSofi") sin repetir a nadie.
function leerNombres(texto) {
  const vistos = new Set();
  return String(texto ?? '').split(/[,;\n]+/).map(n => limpiarNombre(n)).filter(n => {
    const clave = normalizar(n);
    if (!clave || vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}

function textoDivision(v) {
  const nombres = leerNombres(v.personas);
  const total = Math.round(v.total || 0);
  if (total <= 0 || !nombres.length) return 'Escribe el total y con quiénes, y te digo cuánto pone cada uno.';
  const { porPersona, tuParte } = dividirGasto(total, nombres.length, v.me_incluyo);
  const iguales = porPersona.every(n => n === porPersona[0]);
  const cada = iguales ? clp(porPersona[0]) : `${clp(porPersona.at(-1))} a ${clp(porPersona[0])}`;
  const suma = porPersona.reduce((s, n) => s + n, 0);
  const quien = nombres.length === 1 ? `${nombres[0]} te debe ${cada}` : `Cada uno te debe ${cada}`;
  return `${quien}${v.me_incluyo ? ` y tu parte es ${clp(tuParte)}` : ''}. Por cobrar: ${clp(suma)}.`;
}

async function dividir(refrescar) {
  const conocidos = nombresConocidos();
  const v = await abrirFormulario({
    titulo: 'Dividir un gasto',
    textoGuardar: 'Anotar',
    campos: [
      { nombre: 'concepto', etiqueta: '¿Qué pagaste?', requerido: true, placeholder: 'ej: asado del sábado' },
      { nombre: 'total', etiqueta: 'Total que pagaste ($)', tipo: 'monto', requerido: true },
      { nombre: 'personas', etiqueta: '¿Con quiénes?', tipo: 'textarea', requerido: true, placeholder: 'ej: Cata, Diego, Sofi',
        ayuda: `Sepáralos con coma.${conocidos.length ? ` Ya anotados: ${conocidos.slice(0, 6).join(', ')}${conocidos.length > 6 ? '…' : ''}.` : ''}` },
      { nombre: 'me_incluyo', etiqueta: 'Yo también pongo mi parte', tipo: 'checkbox', valor: true },
      { nombre: 'anotar_gasto', etiqueta: 'Anotar el total como gasto de hoy', tipo: 'checkbox',
        ayuda: 'Si lo pagaste en efectivo o todavía no está en tus movimientos.' },
      { nombre: 'fecha', etiqueta: '¿Para cuándo te pagan?', tipo: 'date', ayuda: 'Opcional. Ese día te aviso.' },
    ],
    vistaPrevia: textoDivision,
  });
  if (!v) return;
  const nombres = leerNombres(v.personas);
  const total = Math.round(v.total || 0);
  if (total <= 0 || !nombres.length) return avisar('Escribe el total y con quiénes lo dividiste.', 'error');
  if (nombres.length > 30) return avisar('Son demasiadas personas: divide el gasto en partes.', 'error');
  const { porPersona } = dividirGasto(total, nombres.length, v.me_incluyo);
  const concepto = String(v.concepto).trim().slice(0, 80);

  ejecutar(async () => {
    for (const [i, nombre] of nombres.entries()) {
      const p = await guardarPersona(personaPorNombre(nombre));
      await guardar('cobros', { persona_id: p.id, concepto, monto_total: porPersona[i], cuotas: 1, primer_vencimiento: v.fecha || null, estado: 'pendiente' });
    }
    if (v.anotar_gasto) await anotarGasto(total, concepto);
  }, `Anotado: ${nombres.length === 1 ? `${nombres[0]} te debe` : `${nombres.length} personas te deben`} ${clp(porPersona.reduce((t, n) => t + n, 0))} por ${concepto}`, refrescar);
}

async function renombrar(persona, refrescar) {
  const v = await abrirFormulario({
    titulo: 'Cambiar el nombre',
    campos: [{ nombre: 'nombre', etiqueta: 'Nombre', valor: persona.nombre, requerido: true }],
  });
  if (!v) return;
  const nombre = limpiarNombre(v.nombre);
  if (!nombre) return;
  const otra = datos.personas.find(p => p.id !== persona.id && normalizar(p.nombre) === normalizar(nombre));
  if (otra) return avisar(`Ya tienes a alguien con el nombre ${otra.nombre}. Usa otro para no confundirlos.`, 'error');
  ejecutar(() => guardar('personas', { ...persona, nombre }), 'Nombre cambiado', refrescar);
}

export function montar(raiz, refrescar) {
  pintarAvisos(raiz);
  const cobro = id => datos.cobros.find(c => c.id === id);
  raiz.querySelector('#nuevo-cobro').addEventListener('click', () => anotarCobro(null, refrescar));
  raiz.querySelector('#dividir').addEventListener('click', () => dividir(refrescar));
  raiz.querySelectorAll('[data-pagar-cobro]').forEach(b => b.addEventListener('click', () => registrarPago(cobro(b.dataset.pagarCobro), refrescar)));
  raiz.querySelectorAll('[data-editar-cobro]').forEach(b => b.addEventListener('click', () => anotarCobro(cobro(b.dataset.editarCobro), refrescar)));
  raiz.querySelectorAll('[data-renombrar]').forEach(b => b.addEventListener('click', () => renombrar(datos.personas.find(p => p.id === b.dataset.renombrar), refrescar)));
  raiz.querySelectorAll('.persona-cobro').forEach(d => d.addEventListener('toggle', () => {
    if (d.open) abiertas.add(d.dataset.persona);
    else abiertas.delete(d.dataset.persona);
  }));
}
