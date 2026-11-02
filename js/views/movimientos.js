import { datos, guardar, borrar, guardarPerfil } from '../db.js';
import { clasificar, aprender } from '../clasificador.js';
import { cobrosParaTransferencia, estadoCobro, personaDeTransferencia } from '../calculos.js';
import { normalizarPerfil } from '../validar.js';
import { esMismoNombre } from '../../supabase/functions/recibir-compra/cuentas.js';
import { abrirFormulario, avisar, confirmar, ejecutar } from '../ui.js';
import { misTarjetas, misClaves, cuentaPorId, nombreTarjeta, nombreCorto, nombreDelBanco } from '../mis-tarjetas.js';
import { hayComercios, comercioPorId, conComercio, juntarComercios } from '../mis-comercios.js';
import { esTransferencia as esTransferenciaTexto } from '../comercios.js';
import { descuentosEn, textoDias } from '../beneficios.js';
import { pagosDelMes, esPagoAnotado } from '../pagos.js';
import { clp, clpVisible, esc, hoyISO, mesActual, mesDe, nombreMes, sumarMeses, fechaCorta } from '../util.js';

export const titulo = 'Gastos';

let mesVisto = mesActual();
let filtro = 'todos';

const FILTROS = [['todos', 'Todos'], ['pendientes', 'Por revisar'], ['gastos', 'Gastos'], ['ingresos', 'Ingresos'], ['eventos', 'Eventos']];

export function render() {
  const lista = datos.movimientos
    .filter(m => mesDe(m.fecha) === mesVisto)
    .filter(m => ({
      todos: true,
      pendientes: m.estado === 'pendiente',
      gastos: m.tipo === 'gasto',
      ingresos: m.tipo === 'ingreso',
      eventos: !!m.evento_id,
    })[filtro])
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const porFecha = new Map();
  for (const m of lista) {
    if (!porFecha.has(m.fecha)) porFecha.set(m.fecha, []);
    porFecha.get(m.fecha).push(m);
  }

  const totalGastos = lista.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0);

  return `
    <div class="selector-mes">
      <button class="boton-icono" data-mes="-1" aria-label="Mes anterior">‹</button>
      <h2>${esc(nombreMes(mesVisto))}</h2>
      <button class="boton-icono" data-mes="1" aria-label="Mes siguiente" ${mesVisto >= mesActual() ? 'disabled' : ''}>›</button>
    </div>
    <div class="chips" role="group" aria-label="Filtrar">
      ${FILTROS.map(([v, t]) => `<button class="chip" data-filtro="${v}" aria-pressed="${filtro === v}">${t}</button>`).join('')}
    </div>
    <p class="resumen-lista">${lista.length} movimientos · ${clp(totalGastos)} en gastos</p>
    ${lista.length ? [...porFecha].map(([fecha, movs]) => `
      <h3 class="separador-fecha">${esc(fechaCorta(fecha))}</h3>
      <ul class="lista">${movs.map(m => filaMovimiento(m)).join('')}</ul>`).join('')
    : `<div class="vacio">No hay movimientos ${filtro === 'todos' ? 'este mes' : 'con este filtro'}.<br>Usa el botón <b>+</b> para agregar uno.</div>`}
  `;
}

// accion: HTML de un botón al lado de la fila (en Inicio, "✓ Supermercado").
export function filaMovimiento(m, accion = '') {
  const cat = datos.categorias.find(c => c.id === m.categoria_id);
  const evento = datos.eventos.find(e => e.id === m.evento_id);
  const tarjeta = m.cuenta_id ? cuentaPorId(m.cuenta_id) : null;
  const nombre = m.descripcion || m.comercio || cat?.nombre || 'Sin descripción';
  const detalle = [
    m.estado === 'pendiente' ? '<span class="etiqueta pendiente">Por revisar</span>' : esc(cat?.nombre || 'Sin categoría'),
    m.comercio && m.descripcion ? esc(m.comercio) : '',
    evento ? `<span class="etiqueta evento">${esc(evento.nombre)}</span>` : '',
    tarjeta ? esc(nombreCorto(tarjeta)) : '',
    // Llegó solo (fase 2): del aviso del banco o del Atajo de Wallet.
    { correo: 'del correo', wallet: 'de Apple Pay' }[m.origen] || '',
  ].filter(Boolean).join(' · ');
  return `<li${accion ? ' class="con-accion"' : ''}>
    <button class="fila" data-mov="${m.id}">
      <span class="icono-cat" aria-hidden="true">${esc(cat?.icono || (m.estado === 'pendiente' ? '❔' : '•'))}</span>
      <span class="fila-texto"><b>${esc(nombre)}</b><small>${detalle}</small></span>
      <span class="monto ${m.tipo}">${m.tipo === 'ingreso' ? '+' : ''}${clp(m.monto)}</span>
    </button>${accion}
  </li>`;
}

export function montar(raiz, refrescar) {
  raiz.querySelectorAll('[data-mes]').forEach(b => b.addEventListener('click', () => {
    mesVisto = sumarMeses(mesVisto, Number(b.dataset.mes));
    refrescar();
  }));
  raiz.querySelectorAll('[data-filtro]').forEach(b => b.addEventListener('click', () => {
    filtro = b.dataset.filtro;
    refrescar();
  }));
  montarFilas(raiz, refrescar);
}

export function montarFilas(raiz, refrescar) {
  raiz.querySelectorAll('[data-mov]').forEach(b => b.addEventListener('click', () => {
    const mov = datos.movimientos.find(m => m.id === b.dataset.mov);
    if (mov.estado === 'pendiente') darContexto(mov, refrescar);
    else editarMovimiento(mov, refrescar);
  }));
}

// Una transferencia que hiciste ("Transferencia a …") puede ser plata que te
// pasaste a ti mismo; esa no es un gasto. "Me la pasé yo" la borra y, si
// quieres, recuerda ese nombre como tuyo (Ajustes → Tus cuentas): así las
// próximas no llegan, ni aunque el mismo correo se lea de nuevo.
export const esTransferencia = mov => esTransferenciaTexto(mov.comercio);

// Los nombres que tendrías al recordar el de esta transferencia, o null si no
// se puede: una sola palabra, caracteres raros, ya está o ya hay 5.
function conEsteNombre(mov) {
  const persona = personaDeTransferencia(mov.comercio);
  const actuales = datos.perfil.nombres_propios || [];
  if (!persona || actuales.some(n => esMismoNombre(n, persona))) return null;
  const { nombres_propios } = normalizarPerfil({ nombres_propios: [...actuales, persona] });
  return nombres_propios.includes(persona) ? { persona, nombres_propios } : null;
}

// El campo "recordar" solo aparece si ese nombre se puede recordar.
function campoRecordar(mov) {
  const persona = conEsteNombre(mov)?.persona;
  if (!persona) return [];
  return [{ nombre: 'recordar', etiqueta: `Si es mía: recordar «${persona}» como mi nombre`, tipo: 'checkbox', valor: true, ayuda: 'Las próximas transferencias con ese nombre no se anotarán.' }];
}

async function sacarPropia(mov, recordar, listo, refrescar) {
  const nuevo = recordar ? conEsteNombre(mov) : null;
  await ejecutar(async () => {
    if (nuevo) await guardarPerfil({ nombres_propios: nuevo.nombres_propios });
    await borrar('movimientos', mov.id);
  }, nuevo ? `${listo}. Recordé «${nuevo.persona}» como tu nombre` : listo, refrescar);
}

// Para compras que llegaron solas: escribes qué fue y la app la clasifica.
export async function darContexto(mov, refrescar) {
  if (mov.tipo === 'ingreso') return darContextoIngreso(mov, refrescar);
  const transferencia = esTransferencia(mov);
  // Con qué tarjeta fue, si el aviso lo dijo (se corrige en el formulario completo).
  const tarjeta = mov.cuenta_id ? cuentaPorId(mov.cuenta_id) : null;
  const valores = await abrirFormulario({
    titulo: transferencia ? '¿Para qué fue esta transferencia?' : '¿Qué fue esta compra?',
    intro: `<b>${esc(clpVisible(mov.monto))}</b> ${transferencia ? '·' : 'en'} <b>${esc(mov.comercio || 'comercio desconocido')}</b> · ${esc(fechaCorta(mov.fecha))}${tarjeta ? ` · con tu ${esc(nombreCorto(tarjeta))}` : ''}`,
    campos: [
      { nombre: 'descripcion', etiqueta: 'Cuéntame en tus palabras', tipo: 'textarea', placeholder: transferencia ? 'ej: mi parte del asado' : 'ej: uber al aeropuerto para lo del matri', requerido: !transferencia },
      ...(transferencia ? [{ nombre: 'mias', etiqueta: 'Me la pasé yo, entre mis cuentas', tipo: 'checkbox', ayuda: 'No es un gasto: la saco de la lista.' }, ...campoRecordar(mov)] : []),
    ],
    textoGuardar: 'Listo',
  });
  if (!valores) return;
  if (valores.mias) return sacarPropia(mov, valores.recordar, 'Listo, no cuenta como gasto', refrescar);
  if (!valores.descripcion) return editarMovimiento(mov, refrescar);

  const guess = clasificar({ comercio: mov.comercio, descripcion: valores.descripcion });
  if (!guess.categoria_id) {
    // No supimos: abrimos el formulario completo con lo que escribió.
    return editarMovimiento({ ...mov, descripcion: valores.descripcion, evento_id: guess.evento_id }, refrescar);
  }
  const cat = datos.categorias.find(c => c.id === guess.categoria_id);
  const evento = datos.eventos.find(e => e.id === guess.evento_id);
  await ejecutar(async () => {
    await aprender(mov.comercio, guess.categoria_id);
    await guardar('movimientos', await conComercio({ ...mov, descripcion: valores.descripcion, categoria_id: guess.categoria_id, evento_id: guess.evento_id || mov.evento_id || null, estado: 'clasificado' }));
  }, `Ah, corresponde a ${cat.icono} ${cat.nombre}${evento ? ' · ' + evento.nombre : ''}`, refrescar);
}

// Plata que llegó sola: si quien la mandó te debía algo, se propone ese cobro.
async function darContextoIngreso(mov, refrescar) {
  const cobros = cobrosParaTransferencia(mov.comercio);
  const sugerido = cobros.find(x => x.calza);
  const valores = await abrirFormulario({
    titulo: '¿De qué es esta plata?',
    intro: `Te llegaron <b>${esc(clpVisible(mov.monto))}</b> · ${esc(mov.comercio || 'sin nombre')} · ${esc(fechaCorta(mov.fecha))}`,
    campos: [{
      nombre: 'es', etiqueta: 'Es…', tipo: 'select', valor: sugerido ? 'c:' + sugerido.c.id : 'otro',
      opciones: [
        ...cobros.map(x => ['c:' + x.c.id, `Lo que me debía ${x.persona.nombre}: ${x.c.concepto}`]),
        ['otro', 'Otra cosa (sueldo, una venta, un regalo…)'],
        ['mias', 'Me la pasé yo, entre mis cuentas'],
      ],
    }, ...campoRecordar(mov)],
    textoGuardar: 'Listo',
  });
  if (!valores) return;
  if (valores.es === 'mias') return sacarPropia(mov, valores.recordar, 'Listo, no cuenta como ingreso', refrescar);
  const elegido = cobros.find(x => 'c:' + x.c.id === valores.es);
  if (!elegido) return editarMovimiento(mov, refrescar);

  const { c, e, persona } = elegido;
  // Como al registrar un pago a mano: si es más de lo que falta, se pregunta.
  if (mov.monto > e.pendiente && !(await confirmar(`Es más de lo que ${persona.nombre} te debe por "${c.concepto}" (${clpVisible(e.pendiente)}). ¿Registrarlo igual?`))) return;
  await ejecutar(async () => {
    await guardar('movimientos', {
      ...mov, cobro_id: c.id, categoria_id: null, estado: 'clasificado',
      descripcion: `Pago de ${persona.nombre} · ${c.concepto}`.slice(0, 200),
    });
    if (estadoCobro(c).saldado) avisar(`Listo: ${persona.nombre} ya te pagó todo "${c.concepto}".`, 'logro');
    else avisar(`Listo, ${persona.nombre} te pagó ${clp(mov.monto)}.`);
  }, null, refrescar);
}

export async function editarMovimiento(mov, refrescar) {
  const nuevo = !mov?.id;
  const m = mov || { tipo: 'gasto', fecha: hoyISO() };

  const categorias = datos.categorias.slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  const opcionesCat = [
    ['', nuevo ? 'Adivinar según lo que escriba' : 'Sin categoría'],
    ...categorias.filter(c => c.tipo !== 'ingreso').map(c => [c.id, `${c.icono} ${c.nombre}`]),
    ...categorias.filter(c => c.tipo === 'ingreso').map(c => [c.id, `${c.icono} ${c.nombre} (ingreso)`]),
  ];
  const opcionesPago = [
    ['', 'No, es un gasto del día a día'],
    ...datos.compromisos.filter(c => c.activo !== false || c.id === m.compromiso_id).map(c => ['c:' + c.id, `Pago fijo: ${c.nombre}`]),
    ...datos.deudas.filter(d => d.saldo > 0 || d.id === m.deuda_id).map(d => ['d:' + d.id, `Pago de deuda: ${d.nombre}`]),
  ];
  // ¿Qué mes paga? El de su fecha, o el anterior o el siguiente (el arriendo de
  // noviembre pagado el 30 de octubre).
  const mesBase = mesDe(m.fecha || hoyISO());
  const mesDelPago = m.mes_pagado || mesBase;
  const opcionesMes = [...new Set([sumarMeses(mesBase, -1), mesBase, sumarMeses(mesBase, 1), mesDelPago])].sort()
    .map(x => [x, nombreMes(x)]);
  // Tus tarjetas, y la de este gasto aunque la hayas quitado (quedó archivada).
  const usada = m.cuenta_id ? cuentaPorId(m.cuenta_id) : null;
  const tarjetas = [...misTarjetas(), ...(usada && usada.activa === false ? [usada] : [])];
  // Su comercio: los otros, para juntarlo si es el mismo lugar escrito distinto,
  // y los descuentos que tienes ahí con tus tarjetas.
  const comercio = m.comercio_id && hayComercios() ? comercioPorId(m.comercio_id) : null;
  const otros = comercio ? datos.comercios.filter(c => c.id !== comercio.id).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')) : [];
  const descuentos = comercio ? descuentosEn(comercio.patrones, misClaves(), hoyISO()).slice(0, 2) : [];

  const valores = await abrirFormulario({
    titulo: nuevo ? 'Nuevo movimiento' : 'Editar movimiento',
    puedeBorrar: !nuevo,
    intro: descuentos.map(b => `🏷️ En ${esc(b.comercio)} tienes ${esc(b.descuento)} ${b.dias.length ? `(${esc(textoDias(b.dias))}) ` : ''}con tu ${esc(nombreDelBanco(b.tarjeta))}.`).join('<br>'),
    campos: [
      { nombre: 'tipo', etiqueta: 'Tipo', tipo: 'select', valor: m.tipo, opciones: [['gasto', 'Gasto'], ['ingreso', 'Ingreso']] },
      { nombre: 'monto', etiqueta: 'Monto ($)', tipo: 'monto', valor: m.monto, requerido: true },
      { nombre: 'descripcion', etiqueta: '¿Qué fue?', tipo: 'text', valor: m.descripcion, placeholder: 'ej: almuerzo con la Cata' },
      { nombre: 'categoria_id', etiqueta: 'Categoría', tipo: 'select', valor: m.categoria_id || '', opciones: opcionesCat },
      { nombre: 'fecha', etiqueta: 'Fecha', tipo: 'date', valor: m.fecha, requerido: true },
      { nombre: 'comercio', etiqueta: 'Comercio (opcional)', tipo: 'text', valor: m.comercio },
      ...(otros.length ? [{ nombre: 'mismo', etiqueta: `¿${comercio.nombre} es el mismo lugar que otro?`, tipo: 'select', valor: '',
        opciones: [['', 'No, es otro lugar'], ...otros.map(c => [c.id, c.nombre])],
        ayuda: 'Si eliges uno, quedan juntos: sus gastos y la categoría aprendida.' }] : []),
      ...(tarjetas.length ? [{ nombre: 'cuenta_id', etiqueta: '¿Con qué tarjeta?', tipo: 'select', valor: m.cuenta_id || '',
        opciones: [['', 'Otra, o no fue con tarjeta'], ...tarjetas.map(c => [c.id, nombreTarjeta(c)])] }] : []),
      { nombre: 'evento_id', etiqueta: 'Evento (opcional)', tipo: 'select', valor: m.evento_id || '', opciones: [['', 'Ninguno'], ...datos.eventos.filter(e => e.activo !== false || e.id === m.evento_id).map(e => [e.id, e.nombre])] },
      { nombre: 'pago', etiqueta: '¿Es un pago planificado?', tipo: 'select', valor: m.compromiso_id ? 'c:' + m.compromiso_id : m.deuda_id ? 'd:' + m.deuda_id : '', opciones: opcionesPago, ayuda: 'Los pagos fijos y de deudas ya están descontados del disponible, así que no se cuentan dos veces.' },
      ...(datos.compromisos.length ? [{ nombre: 'mes_pagado', etiqueta: 'Si es un pago fijo, ¿de qué mes?', tipo: 'select', valor: mesDelPago, opciones: opcionesMes }] : []),
    ],
  });

  if (!valores) return;
  if (valores === 'borrar') return ejecutar(() => borrar('movimientos', m.id), 'Movimiento borrado', refrescar);

  const { pago, mismo, mes_pagado: mesElegido, ...resto } = valores;
  const juntarCon = mismo && comercio ? comercioPorId(mismo) : null;
  const fila = {
    ...m, ...resto,
    monto: Math.round(resto.monto || 0),
    compromiso_id: pago?.startsWith('c:') ? pago.slice(2) : null,
    deuda_id: pago?.startsWith('d:') ? pago.slice(2) : null,
    mes_pagado: null,
    // Sin tarjetas para elegir no hay pregunta: queda como estaba.
    cuenta_id: resto.cuenta_id === undefined ? (m.cuenta_id ?? null) : tarjetas.some(c => c.id === resto.cuenta_id) ? resto.cuenta_id : null,
    origen: m.origen || 'manual',
  };

  // El mes que paga: el que elegiste. Si no lo tocaste y seguía a la fecha, sigue a
  // la fecha nueva; si era otro a propósito (pago adelantado), se queda.
  if (fila.compromiso_id) {
    const seguiaLaFecha = mesDelPago === mesBase;
    fila.mes_pagado = mesElegido && (mesElegido !== mesDelPago || !seguiaLaFecha) ? mesElegido : mesDe(fila.fecha);
  }
  // Un pago anotado por la app que ya no paga lo mismo deja de serlo: así
  // "Deshacer" no lo borra.
  if (esPagoAnotado(m) && (fila.compromiso_id !== m.compromiso_id || fila.mes_pagado !== m.mes_pagado)) fila.id_externo = null;
  // Una compra real que paga un mes reemplaza al pago anotado con "Pagado" ese
  // mes: si no, ese mes contaría dos veces.
  const reemplazados = fila.compromiso_id && !esPagoAnotado(fila)
    ? pagosDelMes(datos.movimientos, fila.mes_pagado, fila.compromiso_id).filter(x => x.id !== fila.id && esPagoAnotado(x))
    : [];

  let mensaje = nuevo ? 'Movimiento guardado' : 'Cambios guardados';
  if (!fila.categoria_id && fila.tipo === 'gasto') {
    const guess = clasificar(fila);
    if (guess.categoria_id) {
      fila.categoria_id = guess.categoria_id;
      const cat = datos.categorias.find(c => c.id === guess.categoria_id);
      mensaje = `Guardado en ${cat.icono} ${cat.nombre} (${guess.motivo})`;
    }
    if (guess.evento_id && !fila.evento_id) fila.evento_id = guess.evento_id;
  }
  fila.estado = fila.categoria_id || fila.tipo === 'ingreso' ? 'clasificado' : 'pendiente';

  let deudaTerminada = null;
  await ejecutar(async () => {
    // Juntar va primero: el gasto queda en el comercio que se queda, que conserva
    // su categoría (por eso al juntar no se aprende la de este gasto).
    if (juntarCon) await juntarComercios(comercio, juntarCon);
    // Aprender antes de guardar: si el comercio es nuevo, se crea ya con su categoría.
    else if (fila.comercio && fila.categoria_id) await aprender(fila.comercio, fila.categoria_id);
    await guardar('movimientos', await conComercio(fila));

    for (const x of reemplazados) await borrar('movimientos', x.id);
    // Un pago nuevo de deuda baja el saldo (después lo puedes ajustar con la cartola).
    if (fila.deuda_id && (nuevo || fila.deuda_id !== m.deuda_id)) {
      const d = datos.deudas.find(x => x.id === fila.deuda_id);
      const saldo = Math.max(0, (d?.saldo || 0) - fila.monto);
      if (d) await guardar('deudas', { ...d, saldo });
      if (d?.saldo > 0 && saldo === 0) deudaTerminada = d;
    }
  }, mensaje, refrescar);

  if (deudaTerminada) return avisar(`Terminaste de pagar ${deudaTerminada.nombre}.`, 'logro');
  if (fila.estado === 'pendiente' && fila.tipo === 'gasto') avisar('Guardado. Quedó "por revisar" porque no supe la categoría.');
}
